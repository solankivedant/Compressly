/// <reference lib="webworker" />
// The compression engine. Runs in a Web Worker on whatever device opened the site, so nothing is uploaded:
// videos go through the device's own encoder (WebCodecs, usually the hardware one the camera uses),
// photos through WebAssembly encoders. One worker handles one file at a time; the page runs a few side by side.

import encodeAvif from '@jsquash/avif/encode';
import encodeJpeg from '@jsquash/jpeg/encode';
import optimisePng from '@jsquash/oxipng/optimise';
import { unzipSync, zipSync, type Zippable } from 'fflate';
import { PDFArray, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFStream, type PDFRef } from 'pdf-lib';
import {
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  Conversion,
  Input,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  canEncodeVideo,
} from 'mediabunny';
import { DOC_JPEG_QUALITY, DOC_MIME, PHOTO_FORMATS, PRESETS, checkFrames, videoTargetKbps } from '@/lib/rules';
import type { ItemResult, JobIn, JobOut, MediaItem, Settings } from '@/lib/types';
import { mp4Time, setVideoTime, videoCreationTime, withPhotoDate } from './dates';
import { openOutputWriter } from './opfs';
import { luma, ssim } from './ssim';

declare const self: DedicatedWorkerGlobalScope;

class Cancelled extends Error {}

let current: { id: string; cancelled: boolean; conversion?: Conversion } | null = null;

const post = (m: JobOut) => self.postMessage(m);

self.onmessage = async (e: MessageEvent<JobIn>) => {
  const m = e.data;
  if (m.type === 'cancel') {
    if (current?.id === m.id) {
      current.cancelled = true;
      await current.conversion?.cancel().catch(() => {});
    }
    return;
  }
  current = { id: m.id, cancelled: false };
  const job = current;
  const stage = (state: 'compressing' | 'checking' | 'saving', progress: number) => {
    if (job.cancelled) throw new Cancelled();
    post({ type: 'stage', id: m.id, state, progress });
  };
  try {
    const result =
      m.item.kind === 'video'
        ? await compressVideo(m.item, m.file, m.settings, stage, job)
        : m.item.kind === 'doc'
          ? await compressDoc(m.item, m.file, m.settings, stage)
          : await compressPhoto(m.item, m.file, m.settings, stage);
    if (job.cancelled) throw new Cancelled();
    post({ type: 'done', id: m.id, result });
  } catch (err) {
    const cancelled = job.cancelled || err instanceof Cancelled || (err as Error)?.name === 'ConversionCanceledError';
    post({ type: 'error', id: m.id, message: cancelled ? 'Cancelled' : friendly(err), cancelled });
  } finally {
    if (current === job) current = null;
  }
};

function friendly(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/unsupported|not supported|decode/i.test(msg)) return `This browser can't open this file's format. ${msg}`;
  return msg;
}

// ---------- Video ----------

type Stage = (state: 'compressing' | 'checking' | 'saving', progress: number) => void;

/** HEVC if this device can encode it at this size, else H.264 at ×1.4 the bitrate (the app's fallback). */
async function pickCodec(s: Settings, item: MediaItem, kbps: number) {
  const size = { width: item.width, height: item.height, bitrate: kbps * 1000 };
  if (s.videoCodec === 'hevc' && (await canEncodeVideo('hevc', size))) return { codec: 'hevc' as const, kbps, fellBack: false };
  const avcKbps = s.videoCodec === 'hevc' ? Math.round(kbps * 1.4) : kbps;
  if (await canEncodeVideo('avc', { ...size, bitrate: avcKbps * 1000 })) return { codec: 'avc' as const, kbps: avcKbps, fellBack: s.videoCodec === 'hevc' };
  throw new Error(`This device can't encode ${item.width}×${item.height} video in the browser.`);
}

/** The output keeps the original's file type where it can (MOV stays MOV, M4V stays M4V), so it can replace it. */
function videoContainer(item: MediaItem) {
  if (item.ext === 'mov') return { ext: 'mov', mime: 'video/quicktime', format: () => new MovOutputFormat({ fastStart: false }) };
  return { ext: item.ext === 'm4v' ? 'm4v' : 'mp4', mime: 'video/mp4', format: () => new Mp4OutputFormat({ fastStart: false }) };
}

async function encodeOnce(item: MediaItem, file: File, codec: 'hevc' | 'avc', kbps: number, time: number, stage: Stage, job: { conversion?: Conversion }) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const box = videoContainer(item);
  const writer = await openOutputWriter(item.id, box.ext);
  try {
    const output = new Output({ format: box.format(), target: new StreamTarget(writer.stream as WritableStream) });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { codec, quality: new Quality({ bitrate: kbps * 1000 }), keyFrameInterval: 2, forceTranscode: true },
      audio: {}, // copied as is when the container allows it; otherwise re-encoded (AAC)
    });
    if (!conversion.isValid) {
      const why = conversion.discardedTracks.map((d) => d.reason).join(', ');
      throw new Error(`This video can't be converted in this browser (${why}).`);
    }
    job.conversion = conversion;
    conversion.onProgress = (p) => {
      try {
        stage('compressing', Math.min(0.99, p));
      } catch {} // cancelling is handled by conversion.cancel()
    };
    await conversion.execute();
    // The new file is stamped with today; put the original's recording time back so the gallery keeps its place.
    await setVideoTime(writer, time);
    const audioNote = conversion.utilizedTracks.some((t) => t.type === 'audio') ? null : item.hasAudio ? 'The sound track could not be kept.' : null;
    return { bytes: writer.close(), audioNote };
  } catch (e) {
    writer.close();
    throw e;
  } finally {
    input.dispose();
  }
}

/** SSIM on brightness of evenly spread frames of both copies, at full resolution. */
async function measureVideo(item: MediaItem, original: File, compressed: File, stage: Stage) {
  const a = new Input({ formats: ALL_FORMATS, source: new BlobSource(original) });
  const b = new Input({ formats: ALL_FORMATS, source: new BlobSource(compressed) });
  try {
    const [ta, tb] = await Promise.all([a.getPrimaryVideoTrack(), b.getPrimaryVideoTrack()]);
    if (!ta || !tb) throw new Error('Quality check failed: a video track is missing.');
    const w = ta.displayWidth;
    const h = ta.displayHeight;
    const sa = new CanvasSink(ta, { width: w, height: h, fit: 'fill' });
    const sb = new CanvasSink(tb, { width: w, height: h, fit: 'fill' });
    const n = checkFrames(item.durationSec ?? 0);
    const dur = item.durationSec ?? 0;
    const start = await ta.getFirstTimestamp();
    const times = Array.from({ length: n }, (_, i) => start + ((i + 0.5) / n) * dur);
    let total = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const [ca, cb] = await Promise.all([sa.getCanvas(times[i]), sb.getCanvas(times[i])]);
      if (!ca || !cb) continue;
      const da = (ca.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D).getImageData(0, 0, w, h).data;
      const db = (cb.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D).getImageData(0, 0, w, h).data;
      total += ssim(luma(da, w, h), luma(db, w, h), w, h);
      count++;
      stage('checking', (i + 1) / n);
    }
    if (!count) throw new Error('Quality check failed: no frames could be compared.');
    return total / count;
  } finally {
    a.dispose();
    b.dispose();
  }
}

async function readOutputFile(id: string, ext: string, mime: string) {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('compressed');
  const f = await (await dir.getFileHandle(`${id}.${ext}`)).getFile();
  return new File([f], `out.${ext}`, { type: mime });
}

/** Same resolution and frame rate; one retry at +25% bitrate if the quality gate fails (DESIGN §5.1). */
async function compressVideo(item: MediaItem, file: File, s: Settings, stage: Stage, job: { conversion?: Conversion }): Promise<ItemResult> {
  const started = Date.now();
  const notes: string[] = [];
  const minSsim = PRESETS[s.preset].minSsim;
  const target = videoTargetKbps(s.preset, s.videoCodec, { width: item.width, height: item.height, fps: item.fps ?? 30, bitrateKbps: item.bitrateKbps ?? 0 });
  if (target.capped) notes.push('The source bitrate is already low, so the target was capped at 60% of it.');
  let { codec, kbps, fellBack } = await pickCodec(s, item, target.kbps);
  const time = (await videoCreationTime(file).catch(() => null)) ?? mp4Time(file.lastModified);
  if (fellBack) notes.push("This device can't encode HEVC in the browser, so H.264 was used at 1.4× the bitrate.");
  let score = 0;
  let bytes = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    stage('compressing', 0);
    const r = await encodeOnce(item, file, codec, kbps, time, stage, job);
    bytes = r.bytes;
    if (r.audioNote && !notes.includes(r.audioNote)) notes.push(r.audioNote);
    stage('checking', 0);
    score = await measureVideo(item, file, await readOutputFile(item.id, videoContainer(item).ext, videoContainer(item).mime), stage);
    if (score >= minSsim || attempt === 1) break;
    notes.push(`First try scored ${score.toFixed(4)} (needs ${minSsim}), so it was retried at +25% bitrate.`);
    kbps = Math.round(kbps * 1.25);
  }
  notes.push(`Quality measured on ${checkFrames(item.durationSec ?? 0)} frames spread through the video.`);

  stage('saving', 0.5);
  return {
    outputBytes: bytes,
    outputExt: videoContainer(item).ext,
    outputMime: videoContainer(item).mime,
    ssim: score,
    minSsim,
    preset: s.preset,
    method: `${codec === 'hevc' ? 'HEVC' : 'H.264'} · ${(kbps / 1000).toFixed(1)} Mbps · this device's encoder`,
    targetKbps: kbps,
    seconds: (Date.now() - started) / 1000,
    notes,
    finishedAt: Date.now(),
  };
}

// ---------- Photo ----------

async function pixels(blob: Blob) {
  // Browsers apply the EXIF orientation here, so the picture comes out upright.
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Same pixel size, turned upright. JPEG through mozjpeg; "HEIC" through AVIF (browsers can't show HEIC). */
async function compressPhoto(item: MediaItem, file: File, s: Settings, stage: Stage): Promise<ItemResult> {
  const started = Date.now();
  const notes = [
    PHOTO_FORMATS[s.photoFormat].webNote,
    s.photoFormat === 'jpeg' ? 'Camera details (date taken, place) are kept.' : 'Camera details (date, place) are not copied into HEIC on the web.',
  ];
  const minSsim = PRESETS[s.preset].minSsim;

  stage('compressing', 0.1);
  let img: ImageData;
  try {
    img = await pixels(file);
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name) ? "This browser can't open HEIC photos. Try Safari, or choose JPEG on the phone." : "This browser can't open this photo.");
  }
  stage('compressing', 0.3);
  const jpeg = s.photoFormat === 'jpeg';
  const ext = jpeg ? 'jpg' : 'avif';
  const mime = jpeg ? 'image/jpeg' : 'image/avif';
  const encode = (q: number) => (jpeg ? encodeJpeg(img, { quality: q }) : encodeAvif(img, { quality: q, speed: 7 }));
  const measure = async (bytes: ArrayBuffer) => {
    const out = await pixels(new Blob([bytes], { type: mime }));
    if (out.width !== img.width || out.height !== img.height) throw new Error('The compressed photo came out a different size. Nothing was changed.');
    return ssim(luma(img.data, img.width, img.height), luma(out.data, out.width, out.height), img.width, img.height);
  };

  let q = jpeg ? 90 : s.preset === 'high' ? 70 : s.preset === 'balanced' ? 60 : 50;
  let data = await encode(q);
  stage('checking', 0.3);
  let score = await measure(data);
  // Like videos, one retry at higher quality when the first try misses the bar, if it is still smaller.
  if (score < minSsim) {
    stage('compressing', 0.6);
    const q2 = jpeg ? 95 : q + 15;
    const data2 = await encode(q2);
    if (data2.byteLength < file.size) {
      stage('checking', 0.7);
      const score2 = await measure(data2);
      notes.push(`First try scored ${score.toFixed(4)} (needs ${minSsim}), so it was retried at quality ${q2}.`);
      if (score2 > score) [data, score, q] = [data2, score2, q2];
    }
  }
  const method = jpeg ? `JPEG (mozjpeg) · quality ${q}` : `AVIF (stands in for HEIC) · quality ${q}`;

  stage('saving', 0.5);
  const writer = await openOutputWriter(item.id, ext);
  // JPEG: the original's camera details (date taken, place) go back in, so the gallery keeps the photo on its date.
  const bytes = jpeg ? withPhotoDate(new Uint8Array(await file.arrayBuffer()), new Uint8Array(data), file.lastModified) : new Uint8Array(data);
  writer.writeAll(bytes);
  const outputBytes = writer.close();
  return { outputBytes, outputExt: ext, outputMime: mime, ssim: score, minSsim, preset: s.preset, method, seconds: (Date.now() - started) / 1000, notes, finishedAt: Date.now() };
}

// ---------- Documents ----------
//
// PDF and Office files keep their text, layout and pages exactly; only the pictures inside are recompressed,
// at the same pixel size. Each picture must pass the preset's quality bar and come out smaller, or it is kept as is.

type Picture = { bytes: Uint8Array; score: number };

/**
 * The EXIF orientation of a JPEG (1 = as stored). Documents draw their pictures as stored, but browsers can only
 * decode them turned upright, so a turned picture is left alone rather than re-encoded sideways.
 */
function exifOrientation(b: Uint8Array): number {
  let i = 2;
  while (i + 4 < b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) => (le ? u16(o) | (u16(o + 2) << 16) : (u16(o) << 16) | u16(o + 2));
      const ifd = t + u32(t + 4);
      for (let k = 0, n = u16(ifd); k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (u16(e) === 0x0112) return u16(e + 8);
      }
      return 1;
    }
    if (marker === 0xda) break; // image data starts; no EXIF before it
    i += 2 + len;
  }
  return 1;
}

/** A JPEG picture re-encoded smaller at the same size, or null to keep it as it is. */
async function smallerJpeg(bytes: Uint8Array, s: Settings, gray = false): Promise<Picture | null> {
  if (exifOrientation(bytes) !== 1) return null;
  let img: ImageData;
  try {
    img = await pixels(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
  } catch {
    return null; // a kind of JPEG this browser can't read (e.g. CMYK): leave it alone
  }
  // The preset's quality first; if a picture misses the bar, one retry a step higher (like photos and videos).
  for (const q of [DOC_JPEG_QUALITY[s.preset], Math.min(95, DOC_JPEG_QUALITY[s.preset] + 12)]) {
    const out = new Uint8Array(await encodeJpeg(img, { quality: q, ...(gray ? { color_space: 1 } : {}) }));
    if (out.byteLength > bytes.byteLength * 0.95) return null;
    const back = await pixels(new Blob([out as BlobPart], { type: 'image/jpeg' }));
    if (back.width !== img.width || back.height !== img.height) return null;
    const score = ssim(luma(img.data, img.width, img.height), luma(back.data, back.width, back.height), img.width, img.height);
    if (score >= PRESETS[s.preset].minSsim) return { bytes: out, score };
  }
  return null;
}

/** PNG made smaller without changing a single pixel. */
async function smallerPng(bytes: Uint8Array): Promise<Picture | null> {
  try {
    const out = new Uint8Array(await optimisePng(bytes.slice().buffer, { level: 2 }));
    return out.byteLength < bytes.byteLength * 0.95 ? { bytes: out, score: 1 } : null;
  } catch {
    return null;
  }
}

async function compressDoc(item: MediaItem, file: File, s: Settings, stage: Stage): Promise<ItemResult> {
  const started = Date.now();
  const src = new Uint8Array(await file.arrayBuffer());
  stage('compressing', 0.05);
  const r = item.ext === 'pdf' ? await compressPdf(src, s, stage) : await compressOffice(src, s, stage);
  stage('saving', 0.5);
  const writer = await openOutputWriter(item.id, item.ext);
  writer.writeAll(r.bytes);
  const outputBytes = writer.close();
  const notes = [
    r.total ? `${r.smaller} of ${r.total} pictures made smaller; text and layout are unchanged.` : 'No pictures inside; only the file packaging was tightened.',
  ];
  return {
    outputBytes,
    outputExt: item.ext,
    outputMime: DOC_MIME[item.ext] ?? file.type,
    images: { total: r.total, smaller: r.smaller },
    ssim: r.score,
    minSsim: PRESETS[s.preset].minSsim,
    preset: s.preset,
    method: r.total ? 'Pictures recompressed · PNG lossless' : 'Repacked',
    seconds: (Date.now() - started) / 1000,
    notes,
    finishedAt: Date.now(),
  };
}

/** PPTX / DOCX / XLSX are zip packages; pictures live in ppt/media, word/media or xl/media. */
async function compressOffice(src: Uint8Array, s: Settings, stage: Stage) {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(src);
  } catch {
    throw new Error("This file couldn't be opened. Old .ppt / .doc / .xls files aren't supported; save it as .pptx / .docx / .xlsx first.");
  }
  const pics = Object.keys(files).filter((n) => /\/media\/[^/]+\.(jpe?g|png)$/i.test(n));
  let smaller = 0;
  let score = 1;
  for (let i = 0; i < pics.length; i++) {
    const name = pics[i];
    const better = /\.png$/i.test(name) ? await smallerPng(files[name]) : await smallerJpeg(files[name], s);
    if (better) {
      files[name] = better.bytes;
      smaller++;
      score = Math.min(score, better.score);
    }
    stage('compressing', 0.05 + (0.85 * (i + 1)) / pics.length);
  }
  // [Content_Types].xml first, as Office expects; pictures stored (already compressed), the rest deflated hard.
  const order = Object.keys(files).sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : 0));
  const zip: Zippable = {};
  for (const n of order) zip[n] = [files[n], { level: /\.(jpe?g|png|gif|mp4|m4a|mp3|wav|wmv)$/i.test(n) ? 0 : 9 }];
  return { bytes: zipSync(zip), total: pics.length, smaller, score };
}

/** PDF: JPEG pictures (the big ones in scans and photos) are recompressed in place; everything else is kept. */
async function compressPdf(src: Uint8Array, s: Settings, stage: Stage) {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(src, { updateMetadata: false });
  } catch (e) {
    throw new Error(/encrypt/i.test(String(e)) ? 'This PDF is password-protected, so it is kept as is.' : "This PDF couldn't be opened.");
  }
  const N = (n: string) => PDFName.of(n);
  const pics: [PDFRef, PDFRawStream][] = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(N('Subtype')) !== N('Image')) continue;
    const f = d.lookup(N('Filter'));
    const isJpeg = f === N('DCTDecode') || (f instanceof PDFArray && f.size() === 1 && f.lookup(0) === N('DCTDecode'));
    if (isJpeg && !d.get(N('Decode')) && Number(d.lookup(N('BitsPerComponent'))?.toString() ?? 8) === 8) pics.push([ref, obj]);
  }
  let smaller = 0;
  let score = 1;
  for (let i = 0; i < pics.length; i++) {
    const [ref, obj] = pics[i];
    const d = obj.dict;
    const cs = d.lookup(N('ColorSpace'));
    // Only plain gray or colour pictures (directly or through an ICC profile); CMYK and others are left alone.
    let comps = cs === N('DeviceGray') ? 1 : cs === N('DeviceRGB') ? 3 : 0;
    if (cs instanceof PDFArray && cs.lookup(0) === N('ICCBased')) {
      const icc = cs.lookup(1);
      if (icc instanceof PDFStream) comps = Number(icc.dict.lookup(N('N'))?.toString() ?? 0);
    }
    if (comps === 1 || comps === 3) {
      const better = await smallerJpeg(obj.contents, s, comps === 1);
      if (better) {
        d.set(N('Length'), PDFNumber.of(better.bytes.byteLength));
        doc.context.assign(ref, PDFRawStream.of(d, better.bytes));
        smaller++;
        score = Math.min(score, better.score);
      }
    }
    stage('compressing', 0.05 + (0.85 * (i + 1)) / pics.length);
  }
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, total: pics.length, smaller, score };
}
