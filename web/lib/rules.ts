// Product rules from docs/DESIGN.md §5, shared by server and browser.
import { ACTIVE_STATES, type MediaItem, type PhotoFormat, type Preset, type Settings, type SpeedKey, type Speeds, type VideoCodec } from './types';

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

/**
 * Starting speeds, measured on the dev PC (1080p HEVC "fast" + SSIM ≈ 43 Mpx/s, 3.8 MP AVIF ≈ 5 Mpx/s).
 * Replaced by this computer's own numbers after each finished file.
 */
export const DEFAULT_SPEEDS: Speeds = {
  'video-hevc': { pxPerSec: 40e6, samples: 0 },
  'video-h264': { pxPerSec: 60e6, samples: 0 },
  'photo-jpeg': { pxPerSec: 15e6, samples: 0 },
  'photo-heic': { pxPerSec: 5e6, samples: 0 },
};

export function speedKey(kind: MediaItem['kind'], s: Settings): SpeedKey {
  return kind === 'video' ? `video-${s.videoCodec}` : `photo-${s.photoFormat}`;
}

/** Pixels the job has to push: every frame for video, one picture for a photo. */
export function workPixels(item: Pick<MediaItem, 'kind' | 'width' | 'height' | 'fps' | 'durationSec'>): number {
  const frame = item.width * item.height;
  return item.kind === 'video' ? frame * (item.fps ?? 30) * (item.durationSec ?? 0) : frame;
}

/** Whole-job time in seconds for a file that hasn't started. Assumes no quality retry. */
export function estimateSeconds(item: MediaItem, s: Settings, speeds: Speeds): number {
  const speed = (speeds[speedKey(item.kind, s)] ?? DEFAULT_SPEEDS[speedKey(item.kind, s)]).pxPerSec;
  return Math.max(1, workPixels(item) / speed + (item.kind === 'photo' ? 0.3 : 0.5)); // + fixed start-up cost
}

// How far through the whole job each stage is (video: the quality check is about a quarter of the work).
function overallFraction(item: MediaItem): number {
  if (item.state === 'compressing') return 0.75 * item.progress;
  if (item.state === 'checking') return 0.75 + 0.22 * item.progress;
  if (item.state === 'saving') return 0.97;
  return 0;
}

/** Seconds left for one file: full estimate if waiting, a live countdown if running. */
export function remainingSeconds(item: MediaItem, current: Settings, speeds: Speeds, now = Date.now()): number {
  const s = ACTIVE_STATES.includes(item.state) ? (item.queuedWith ?? current) : current;
  const est = estimateSeconds(item, s, speeds);
  if (item.state === 'new' || item.state === 'queued' || item.state === 'failed') return est;
  if (!ACTIVE_STATES.includes(item.state) || !item.startedAt) return 0;
  const elapsed = Math.max(0, (now - item.startedAt) / 1000);
  const byClock = Math.max(0, est - elapsed);
  const f = item.kind === 'video' ? overallFraction(item) : 0;
  if (f < 0.05) return byClock;
  // Trust the measured progress more as the job goes on.
  const byProgress = (elapsed / f) * (1 - f);
  const w = Math.min(1, f * 2);
  return w * byProgress + (1 - w) * byClock;
}

/** Time until the whole queue (running + waiting) is done. */
export function queueRemainingSeconds(items: MediaItem[], current: Settings, speeds: Speeds, now = Date.now()): number {
  return items.filter((x) => ACTIVE_STATES.includes(x.state)).reduce((n, x) => n + remainingSeconds(x, current, speeds, now), 0);
}
