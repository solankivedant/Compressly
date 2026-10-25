// Product rules from docs/DESIGN.md §5, shared by the pages and the engine.
import { ACTIVE_STATES, LANES, type MediaItem, type PhotoFormat, type Preset, type Settings, type SpeedKey, type Speeds, type VideoCodec } from './types';

export const PRESETS: Record<Preset, { label: string; minSsim: number; pro: boolean; blurb: string }> = {
  high: { label: 'High quality', minSsim: 0.97, pro: true, blurb: 'Smallest change, smaller saving' },
  balanced: { label: 'Balanced', minSsim: 0.95, pro: false, blurb: 'The default. Looks the same, about half the size' },
  max: { label: 'Max savings', minSsim: 0.92, pro: true, blurb: 'Biggest saving, still very close' },
};

export const PHOTO_FORMATS: Record<PhotoFormat, { label: string; webNote: string; typicalSaving: number }> = {
  jpeg: {
    label: 'Optimised JPEG',
    webNote: 'The phone app does this losslessly. The web version re-encodes at quality 90, so it is close but not pixel-identical.',
    typicalSaving: 0.1,
  },
  heic: {
    label: 'HEIC',
    webNote: 'Browsers cannot show HEIC, so the web version uses AVIF (a similar modern format) to show the effect.',
    typicalSaving: 0.45,
  },
};

export const CODECS: Record<VideoCodec, { label: string; note: string }> = {
  hevc: { label: 'HEVC (H.265)', note: 'What the app uses' },
  h264: { label: 'H.264', note: 'App fallback, bitrate × 1.4. Plays in every browser' },
};

// DESIGN §5.1, in Mbps, as [30 fps, 60 fps].
const VIDEO_TABLE: Record<Preset, { uhd: [number, number]; fhd: [number, number] }> = {
  high: { uhd: [40, 60], fhd: [12, 18] },
  balanced: { uhd: [28, 42], fhd: [8, 12] },
  max: { uhd: [18, 28], fhd: [5, 8] },
};

export interface VideoSource {
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
}

/** Target video bitrate in kbps, and whether it was capped by the source. */
export function videoTargetKbps(preset: Preset, codec: VideoCodec, src: VideoSource): { kbps: number; capped: boolean } {
  const atFps = ([v30, v60]: [number, number]) => v30 + ((v60 - v30) * (src.fps - 30)) / 30;
  const pixels = src.width * src.height;
  const raw = pixels === 3840 * 2160 ? atFps(VIDEO_TABLE[preset].uhd) : atFps(VIDEO_TABLE[preset].fhd) * (pixels / (1920 * 1080));
  const presetKbps = Math.min(60, Math.max(2, raw)) * 1000;
  const sourceCap = src.bitrateKbps * 0.6;
  const capped = sourceCap < presetKbps;
  const kbps = Math.min(presetKbps, sourceCap) * (codec === 'h264' ? 1.4 : 1);
  return { kbps: Math.round(kbps), capped };
}

/** Plain words for a measured SSIM (DESIGN §5.3). */
export function qualityWords(ssim: number): string {
  if (ssim >= 0.97) return 'Looks identical';
  if (ssim >= 0.95) return 'Very close';
  return 'Close';
}

// ---------- Time estimates ----------
//
// A video job is two passes over every frame: encoding, then the quality check (SSIM against the original).
// Each pass has its own measured speed in pixels per second. While a file runs, its live speed replaces the
// stored one, so the countdown and every waiting file react within seconds instead of after the first file.

/**
 * Starting speeds, used until this device has finished a file of that kind. Everything runs in the browser:
 * video through the device's own encoder (WebCodecs, usually hardware), photos through WebAssembly encoders.
 * Deliberately on the slow side, since phones are slower than laptops; each device replaces them with its own.
 */
export const DEFAULT_SPEEDS: Speeds = {
  'video-hevc': { pxPerSec: 60e6, samples: 0 },
  'video-h264': { pxPerSec: 60e6, samples: 0 },
  'video-check': { pxPerSec: 15e6, samples: 0 },
  'photo-jpeg': { pxPerSec: 8e6, samples: 0 },
  'photo-heic': { pxPerSec: 1e6, samples: 0 },
  doc: { pxPerSec: 1.5e6, samples: 0 },
};

/** Settings with this file's own format choice applied. */
export function withFormat(item: Pick<MediaItem, 'format'>, s: Settings): Settings {
  return item.format ? { ...s, ...item.format } : s;
}

/** Office files are zip packages; their pictures sit in a media folder. */
export const DOC_EXT = /\.(pdf|pptx|docx|xlsx)$/i;
export const DOC_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Same quality bar idea as photos: pictures inside documents are re-encoded at this JPEG quality. */
export const DOC_JPEG_QUALITY: Record<Preset, number> = { high: 88, balanced: 80, max: 70 };

/** How many frames the video quality check compares: about one every 3 s, between 6 and 30. */
export function checkFrames(durationSec: number): number {
  return Math.max(6, Math.min(30, Math.ceil(durationSec / 3)));
}

/** Pixels the quality check has to compare (both copies of each sampled frame are decoded). */
export function checkPixels(item: Pick<MediaItem, 'width' | 'height' | 'durationSec'>): number {
  return item.width * item.height * checkFrames(item.durationSec ?? 0);
}

/** Expected compressed size, before compressing (DESIGN §5). */
export function estimateBytes(item: MediaItem, settings: Settings): number {
  const s = withFormat(item, settings);
  if (item.kind === 'doc') return Math.round(item.originalBytes * 0.7);
  if (item.kind === 'photo') return Math.round(item.originalBytes * (1 - PHOTO_FORMATS[s.photoFormat].typicalSaving));
  const { kbps } = videoTargetKbps(s.preset, s.videoCodec, {
    width: item.width,
    height: item.height,
    fps: item.fps ?? 30,
    bitrateKbps: item.bitrateKbps ?? 0,
  });
  const bytes = ((kbps + (item.audioKbps ?? 0)) * 1000 * (item.durationSec ?? 0)) / 8;
  return Math.round(Math.min(item.originalBytes, bytes));
}

const START_COST = { video: 0.5, photo: 0.3, doc: 0.5 }; // seconds of fixed overhead per job

export function speedKey(kind: MediaItem['kind'], s: Settings): SpeedKey {
  if (kind === 'doc') return 'doc';
  return kind === 'video' ? `video-${s.videoCodec}` : `photo-${s.photoFormat}`;
}

/** Pixels one pass has to push: every frame for video, one picture for a photo; for documents, their bytes. */
export function workPixels(item: Pick<MediaItem, 'kind' | 'width' | 'height' | 'fps' | 'durationSec' | 'originalBytes'>): number {
  if (item.kind === 'doc') return item.originalBytes;
  const frame = item.width * item.height;
  return item.kind === 'video' ? frame * (item.fps ?? 30) * (item.durationSec ?? 0) : frame;
}

const settingsOf = (item: MediaItem, current: Settings) => (ACTIVE_STATES.includes(item.state) ? (item.queuedWith ?? withFormat(item, current)) : withFormat(item, current));
const rate = (speeds: Speeds, key: SpeedKey) => (speeds[key] ?? DEFAULT_SPEEDS[key]).pxPerSec;

/** Whole-job time in seconds for a file that hasn't started. Assumes no quality retry. */
export function estimateSeconds(item: MediaItem, settings: Settings, speeds: Speeds): number {
  const s = withFormat(item, settings);
  const work = workPixels(item);
  const passes =
    item.kind === 'video'
      ? work / rate(speeds, speedKey('video', s)) + checkPixels(item) / rate(speeds, 'video-check')
      : work / rate(speeds, speedKey(item.kind, s));
  return Math.max(1, passes + START_COST[item.kind]);
}

/**
 * The stored speeds, with each running video's live speed blended in. Early progress is noisy (encoder start-up),
 * so the live number takes over gradually: fully trusted from 30% of a stage, or 2 minutes in.
 */
export function liveSpeeds(items: MediaItem[], current: Settings, speeds: Speeds, now = Date.now()): Speeds {
  const out = { ...speeds };
  for (const x of items) {
    if (x.kind !== 'video' || !x.stageStartedAt || (x.state !== 'compressing' && x.state !== 'checking')) continue;
    const elapsed = (now - x.stageStartedAt) / 1000;
    if (x.progress < 0.02 || elapsed < 3) continue;
    const live = ((x.state === 'checking' ? checkPixels(x) : workPixels(x)) * x.progress) / elapsed;
    const key: SpeedKey = x.state === 'checking' ? 'video-check' : speedKey('video', settingsOf(x, current));
    const trust = Math.min(1, Math.max(x.progress / 0.3, elapsed / 120));
    out[key] = { pxPerSec: rate(speeds, key) * (1 - trust) + live * trust, samples: speeds[key]?.samples ?? 0 };
  }
  return out;
}

/** Seconds left for one file: the full estimate if it hasn't started, a live countdown if it's running. */
export function remainingSeconds(item: MediaItem, current: Settings, speeds: Speeds, now = Date.now()): number {
  const s = settingsOf(item, current);
  if (!ACTIVE_STATES.includes(item.state) || item.state === 'queued') {
    return item.state === 'new' || item.state === 'queued' || item.state === 'failed' ? estimateSeconds(item, s, speeds) : 0;
  }
  if (item.state === 'saving') return 0.5;
  const work = workPixels(item);
  if (item.kind !== 'video') {
    const elapsed = item.startedAt ? (now - item.startedAt) / 1000 : 0;
    return Math.max(0.5, estimateSeconds(item, s, speeds) - elapsed);
  }
  // `speeds` should come from liveSpeeds(), so the running stage already uses its measured speed.
  const check = rate(speeds, 'video-check');
  if (item.state === 'checking') return (checkPixels(item) * (1 - item.progress)) / check + 0.5;
  return (work * (1 - item.progress)) / rate(speeds, speedKey('video', s)) + checkPixels(item) / check + 0.5;
}

/** How far through the whole job a running file is, 0..1, by time (so the bar and the countdown agree). */
export function jobFraction(item: MediaItem, current: Settings, speeds: Speeds, now = Date.now()): number {
  if (item.state === 'saving') return 0.99;
  if (!item.startedAt || (item.state !== 'compressing' && item.state !== 'checking')) return 0;
  const done = Math.max(0, (now - item.startedAt) / 1000);
  const left = remainingSeconds(item, current, speeds, now);
  return Math.min(0.99, done / Math.max(0.001, done + left));
}

export interface QueuePlan {
  /** Seconds until everything running and waiting is done. */
  total: number;
  /** When each file starts and finishes, in seconds from now. */
  byId: Record<string, { start: number; end: number }>;
}

/**
 * Lays the queue out the way the worker runs it: videos one at a time, photos two at a time,
 * both kinds side by side, oldest first. `extra` are files to plan as if they were added to the queue now.
 */
export function planQueue(items: MediaItem[], current: Settings, speeds: Speeds, now = Date.now(), extra: MediaItem[] = []): QueuePlan {
  const byId: QueuePlan['byId'] = {};
  let total = 0;
  for (const kind of ['video', 'photo', 'doc'] as const) {
    const slots: number[] = Array(LANES[kind]).fill(0);
    const mine = items.filter((x) => x.kind === kind && ACTIVE_STATES.includes(x.state));
    const running = mine.filter((x) => x.state !== 'queued');
    const waiting = [
      ...mine.filter((x) => x.state === 'queued').sort((a, b) => a.addedAt - b.addedAt),
      ...extra.filter((x) => x.kind === kind).map((x) => ({ ...x, state: 'queued' as const })),
    ];
    const earliest = () => slots.indexOf(Math.min(...slots));
    for (const x of running) {
      const i = earliest();
      slots[i] += remainingSeconds(x, current, speeds, now);
      byId[x.id] = { start: 0, end: slots[i] };
    }
    for (const x of waiting) {
      const i = earliest();
      const start = slots[i];
      slots[i] += estimateSeconds(x, settingsOf(x, current), speeds);
      byId[x.id] = { start, end: slots[i] };
    }
    total = Math.max(total, ...slots);
  }
  return { total, byId };
}
