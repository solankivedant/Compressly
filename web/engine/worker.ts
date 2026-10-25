/// <reference lib="webworker" />
// The compression engine. Runs in a Web Worker on whatever device opened the site, so nothing is uploaded:
// videos go through the device's own encoder (WebCodecs, usually the hardware one the camera uses),
// photos through WebAssembly encoders. One worker handles one file at a time; the page runs a few side by side.

import encodeAvif from '@jsquash/avif/encode';
import encodeJpeg from '@jsquash/jpeg/encode';
import {
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  canEncodeVideo,
} from 'mediabunny';
import { PHOTO_FORMATS, PRESETS, checkFrames, videoTargetKbps } from '@/lib/rules';
import type { ItemResult, JobIn, JobOut, MediaItem, Settings } from '@/lib/types';
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
    const result = m.item.kind === 'video' ? await compressVideo(m.item, m.file, m.settings, stage, job) : await compressPhoto(m.item, m.file, m.settings, stage);
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

async function encodeOnce(item: MediaItem, file: File, codec: 'hevc' | 'avc', kbps: number, stage: Stage, job: { conversion?: Conversion }) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const writer = await openOutputWriter(item.id, 'mp4');
  try {
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target: new StreamTarget(writer.stream as WritableStream) });
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
  if (fellBack) notes.push("This device can't encode HEVC in the browser, so H.264 was used at 1.4× the bitrate.");
  let score = 0;
  let bytes = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    stage('compressing', 0);
    const r = await encodeOnce(item, file, codec, kbps, stage, job);
    bytes = r.bytes;
    if (r.audioNote && !notes.includes(r.audioNote)) notes.push(r.audioNote);
    stage('checking', 0);
    score = await measureVideo(item, file, await readOutputFile(item.id, 'mp4', 'video/mp4'), stage);
    if (score >= minSsim || attempt === 1) break;
    notes.push(`First try scored ${score.toFixed(4)} (needs ${minSsim}), so it was retried at +25% bitrate.`);
    kbps = Math.round(kbps * 1.25);
  }
  notes.push(`Quality measured on ${checkFrames(item.durationSec ?? 0)} frames spread through the video.`);

  stage('saving', 0.5);
  return {
    outputBytes: bytes,
    outputExt: 'mp4',
    outputMime: 'video/mp4',
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
  const notes = [PHOTO_FORMATS[s.photoFormat].webNote, 'Camera details (date, place) are not copied into the compressed photo on the web.'];
  const minSsim = PRESETS[s.preset].minSsim;

  stage('compressing', 0.1);
  let img: ImageData;
  try {
    img = await pixels(file);
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name) ? "This browser can't open HEIC photos. Try Safari, or choose JPEG on the phone." : "This browser can't open this photo.");
  }
  stage('compressing', 0.3);
  let data: ArrayBuffer, ext: string, mime: string, method: string;
  if (s.photoFormat === 'jpeg') {
    ext = 'jpg';
    mime = 'image/jpeg';
    method = 'JPEG (mozjpeg) · quality 90';
    data = await encodeJpeg(img, { quality: 90 });
  } else {
    ext = 'avif';
    mime = 'image/avif';
    const q = s.preset === 'high' ? 70 : s.preset === 'balanced' ? 60 : 50;
    method = `AVIF (stands in for HEIC) · quality ${q}`;
    data = await encodeAvif(img, { quality: q, speed: 7 });
  }

  stage('checking', 0.3);
  const out = await pixels(new Blob([data], { type: mime }));
  if (out.width !== img.width || out.height !== img.height) throw new Error('The compressed photo came out a different size. Nothing was changed.');
  const score = ssim(luma(img.data, img.width, img.height), luma(out.data, out.width, out.height), img.width, img.height);

  stage('saving', 0.5);
  const writer = await openOutputWriter(item.id, ext);
  writer.writeAll(new Uint8Array(data));
  const outputBytes = writer.close();
  return { outputBytes, outputExt: ext, outputMime: mime, ssim: score, minSsim, preset: s.preset, method, seconds: (Date.now() - started) / 1000, notes, finishedAt: Date.now() };
}
