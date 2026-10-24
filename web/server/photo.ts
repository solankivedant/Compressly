import fsp from 'node:fs/promises';
import sharp from 'sharp';
import { PHOTO_FORMATS, PRESETS } from '@/lib/rules';
import type { ItemResult, MediaItem, Settings } from '@/lib/types';

export async function probePhoto(file: string) {
  const m = await sharp(file).metadata();
  if (!m.width || !m.height) throw new Error('Could not read this photo.');
  // EXIF orientations 5–8 are sideways, so the photo is shown with width and height swapped.
  const sideways = (m.orientation ?? 1) >= 5;
  return { width: sideways ? m.height : m.width, height: sideways ? m.width : m.height, format: m.format ?? 'unknown' };
}

export async function photoThumb(file: string, out: string) {
  await sharp(file).rotate().resize(360, 360, { fit: 'cover' }).jpeg({ quality: 75 }).toFile(out);
}

export function estimatePhotoBytes(originalBytes: number, s: Settings) {
  return Math.round(originalBytes * (1 - PHOTO_FORMATS[s.photoFormat].typicalSaving));
}

/** Mean SSIM on brightness, over 8×8 blocks. */
function ssim(a: Buffer, b: Buffer, w: number, h: number): number {
  const C1 = 6.5025; // (0.01 × 255)²
  const C2 = 58.5225; // (0.03 × 255)²
  const N = 64;
  let sum = 0;
  let blocks = 0;
  for (let y = 0; y + 8 <= h; y += 8) {
    for (let x = 0; x + 8 <= w; x += 8) {
      let ma = 0, mb = 0, aa = 0, bb = 0, ab = 0;
      for (let r = 0; r < 8; r++) {
        const row = (y + r) * w + x;
        for (let c = 0; c < 8; c++) {
          const p = a[row + c];
          const q = b[row + c];
          ma += p; mb += q; aa += p * p; bb += q * q; ab += p * q;
        }
      }
      ma /= N; mb /= N;
      const va = aa / N - ma * ma;
      const vb = bb / N - mb * mb;
      const cov = ab / N - ma * mb;
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      blocks++;
    }
  }
  return blocks ? sum / blocks : 1;
}

const luma = (file: string) => sharp(file).rotate().greyscale().raw().toBuffer({ resolveWithObject: true });

interface Hooks {
  stage: (state: 'compressing' | 'checking' | 'saving', progress: number) => void;
}

/** Same pixel size; the picture is turned upright and the EXIF orientation reset, so it shows the same way. */
export async function compressPhoto(item: MediaItem, input: string, outBase: string, s: Settings, h: Hooks): Promise<ItemResult> {
  const started = Date.now();
  const notes = [PHOTO_FORMATS[s.photoFormat].webNote];
  const minSsim = PRESETS[s.preset].minSsim;

  h.stage('compressing', 0.2);
  const img = sharp(input).rotate().withMetadata({ orientation: 1 });
  let out: string, ext: string, mime: string, method: string;
  if (s.photoFormat === 'jpeg') {
    ext = 'jpg';
    mime = 'image/jpeg';
    out = `${outBase}.${ext}`;
    method = 'JPEG (mozjpeg) · quality 90';
    await img.jpeg({ quality: 90, mozjpeg: true }).toFile(out);
  } else {
    ext = 'avif';
    mime = 'image/avif';
    out = `${outBase}.${ext}`;
    const q = s.preset === 'high' ? 70 : s.preset === 'balanced' ? 60 : 50;
    method = `AVIF (stands in for HEIC) · quality ${q}`;
    await img.avif({ quality: q, effort: 4 }).toFile(out);
  }

  h.stage('checking', 0.3);
  const [a, b] = await Promise.all([luma(input), luma(out)]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    throw new Error('The compressed photo came out a different size. Nothing was changed.');
  }
  const score = ssim(a.data, b.data, a.info.width, a.info.height);

  h.stage('saving', 0.5);
  const outputBytes = (await fsp.stat(out)).size;
  return {
    outputBytes,
    outputExt: ext,
    outputMime: mime,
    ssim: score,
    minSsim,
    preset: s.preset,
    method,
    seconds: (Date.now() - started) / 1000,
    notes,
    finishedAt: Date.now(),
  };
}
