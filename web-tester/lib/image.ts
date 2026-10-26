import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Job } from './jobs';
import { IMAGE_MIN_SSIM, type ImageFormat } from './quality';

const MIME: Record<ImageFormat, string> = { jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif' };
const EXT: Record<ImageFormat, string> = { jpeg: 'jpg', webp: 'webp', avif: 'avif' };

// Mean SSIM on luma over 8x8 blocks. Close enough to the app's gate for comparing settings.
function ssimGrey(a: Buffer, b: Buffer, width: number, height: number): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const B = 8;
  let total = 0;
  let count = 0;
  for (let y = 0; y + B <= height; y += B) {
    for (let x = 0; x + B <= width; x += B) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let j = 0; j < B; j++) {
        let i = (y + j) * width + x;
        for (let k = 0; k < B; k++, i++) {
          const va = a[i];
          const vb = b[i];
          sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb;
        }
      }
      const n = B * B;
      const ma = sa / n, mb = sb / n;
      const va = saa / n - ma * ma, vb = sbb / n - mb * mb, cov = sab / n - ma * mb;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count++;
    }
  }
  return count ? total / count : 1;
}

async function greyRaw(input: string | Buffer) {
  const { data, info } = await sharp(input).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function compressImage(job: Job, format: ImageFormat, quality: number) {
  const started = Date.now();
  const notes: string[] = [];
  job.status = 'encoding';
  job.progress = 0.1;
  job.message = `Encoding ${format.toUpperCase()} at quality ${quality}`;

  const meta = await sharp(job.inputPath).metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read this image.');

  // No resize and no auto-rotate: same pixels, same orientation tag (keepMetadata keeps EXIF).
  let pipeline = sharp(job.inputPath).keepMetadata();
  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  else if (format === 'webp') pipeline = pipeline.webp({ quality, effort: 5 });
  else pipeline = pipeline.avif({ quality, effort: 4 });
  const out = path.join(job.dir, `output.${EXT[format]}`);
  await pipeline.toFile(out);

  job.status = 'checking';
  job.progress = 0.6;
  job.message = 'Measuring SSIM against the original';
  const [a, b] = await Promise.all([greyRaw(job.inputPath), greyRaw(out)]);
  if (a.width !== b.width || a.height !== b.height) throw new Error('Output size differs from the original.');
  const ssim = ssimGrey(a.data, b.data, a.width, a.height);

  const [inStat, outStat] = await Promise.all([fs.stat(job.inputPath), fs.stat(out)]);
  if (outStat.size >= inStat.size) notes.push('Output is not smaller than the original. The app would skip this file.');
  if (format !== 'jpeg') notes.push('The app targets HEIC for Max savings; browsers cannot show HEIC, so AVIF/WebP stand in here.');

  job.outputPath = out;
  job.result = {
    kind: 'image',
    originalBytes: inStat.size,
    outputBytes: outStat.size,
    width: meta.width,
    height: meta.height,
    ssim,
    minSsim: IMAGE_MIN_SSIM,
    passed: ssim >= IMAGE_MIN_SSIM && outStat.size < inStat.size,
    seconds: (Date.now() - started) / 1000,
    outputMime: MIME[format],
    outputExt: EXT[format],
    notes,
  };
}
