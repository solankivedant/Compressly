// Reads a new file's details and makes its thumbnail, on the device, before anything is compressed.

import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';

export interface Probe {
  kind: 'video' | 'photo';
  width: number;
  height: number;
  durationSec?: number;
  fps?: number;
  bitrateKbps?: number;
  sourceCodec?: string;
  hasAudio?: boolean;
  audioKbps?: number;
  thumb: Blob | null;
}

const THUMB = 360;

async function canvasToJpeg(c: HTMLCanvasElement | OffscreenCanvas): Promise<Blob | null> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
  return new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.75));
}

function square(src: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = c.height = THUMB;
  const s = Math.min(w, h);
  c.getContext('2d')!.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, THUMB, THUMB);
  return canvasToJpeg(c);
}

export async function probeVideo(file: File): Promise<Probe> {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const v = await input.getPrimaryVideoTrack();
    if (!v) throw new Error('This file has no video track.');
    const a = await input.getPrimaryAudioTrack();
    const durationSec = (await input.computeDuration()) || 0;
    const fr = await v.computeFrameRateMetrics().catch(() => null);
    const stats = await v.computePacketStats(200).catch(() => null);
    const fps = fr?.underlyingFrameRate ?? stats?.averagePacketRate ?? 30;
    const audioKbps = a ? ((await a.getAverageBitrate().catch(() => null)) ?? (await a.getBitrate().catch(() => null)) ?? 128_000) / 1000 : 0;
    let bitrateKbps = ((await v.getAverageBitrate().catch(() => null)) ?? stats?.averageBitrate ?? 0) / 1000;
    if (!bitrateKbps) bitrateKbps = Math.max(1, (file.size * 8) / 1000 / Math.max(durationSec, 0.1) - audioKbps);
    let thumb: Blob | null = null;
    try {
      const sink = new CanvasSink(v, { width: THUMB * 2, fit: 'contain' });
      const at = Math.min(1, durationSec / 3) + (await v.getFirstTimestamp());
      const wc = await sink.getCanvas(at);
      if (wc) thumb = await square(wc.canvas as HTMLCanvasElement, wc.canvas.width, wc.canvas.height);
    } catch {}
    return {
      kind: 'video',
      // Display size: already upright for phone videos recorded sideways.
      width: v.displayWidth,
      height: v.displayHeight,
      durationSec,
      fps: Math.round(fps * 100) / 100,
      bitrateKbps: Math.round(bitrateKbps),
      sourceCodec: String(v.codec ?? 'unknown').toUpperCase(),
      hasAudio: !!a,
      audioKbps,
      thumb,
    };
  } catch (e) {
    throw new Error(`Could not read this video. ${(e as Error).message}`);
  } finally {
    input.dispose();
  }
}

export async function probePhoto(file: File): Promise<Probe> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name) ? "This browser can't open HEIC photos. Try Safari on iPhone." : 'Could not read this photo.');
  }
  const thumb = await square(bmp, bmp.width, bmp.height).catch(() => null);
  const r: Probe = { kind: 'photo', width: bmp.width, height: bmp.height, thumb };
  bmp.close();
  return r;
}
