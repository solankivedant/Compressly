// Shapes shared by the browser and the Node.js server. No Node imports here.

export type Kind = 'video' | 'photo';
export type Preset = 'high' | 'balanced' | 'max';
export type VideoCodec = 'hevc' | 'h264';
/** The app's two photo modes. On the web, HEIC is stood in for by AVIF (browsers can't show HEIC). */
export type PhotoFormat = 'jpeg' | 'heic';

export type ItemState =
  | 'new' // added, waiting for the user to compress it
  | 'queued'
  | 'compressing'
  | 'checking'
  | 'saving'
  | 'ready' // compressed and passed the quality gate, waiting for the user's decision
  | 'notWorthIt' // gate rejected it, original kept as is
  | 'failed'
  | 'freed' // user accepted the compressed copy
  | 'keptOriginal'; // user chose the original over a ready copy

export const ACTIVE_STATES: ItemState[] = ['queued', 'compressing', 'checking', 'saving'];

export interface Settings {
  preset: Preset;
  videoCodec: VideoCodec;
  photoFormat: PhotoFormat;
}

export interface ItemResult {
  outputBytes: number;
  outputExt: string;
  outputMime: string;
  ssim: number;
  minSsim: number;
  preset: Preset;
  method: string; // e.g. "HEVC · 8.0 Mbps" or "AVIF · quality 60"
  targetKbps?: number;
  seconds: number;
  notes: string[];
  finishedAt: number;
}

export interface MediaItem {
  id: string;
  kind: Kind;
  name: string;
  mime: string;
  ext: string;
  addedAt: number;
  originalBytes: number;
  width: number;
  height: number;
  // Video only
  durationSec?: number;
  fps?: number;
  bitrateKbps?: number;
  sourceCodec?: string;
  hasAudio?: boolean;
  audioKbps?: number;

  estimateBytes: number;
  state: ItemState;
  progress: number; // 0..1 within the current state
  queuedWith?: Settings;
  startedAt?: number; // when the current or last job began
  result?: ItemResult;
  reason?: string; // why it was not worth it, or the error
  decidedAt?: number;
}

export interface Summary {
  libraryBytes: number;
  freedBytes: number;
  pendingBytes: number;
  stillToFreeBytes: number;
  compressedCount: number;
  activeCount: number;
}

/** Which encoder a job uses; each has its own measured speed. */
export type SpeedKey = 'video-hevc' | 'video-h264' | 'photo-jpeg' | 'photo-heic';

/** Measured throughput on this computer, in pixels per second for a whole job (encode + quality check). */
export type Speeds = Record<SpeedKey, { pxPerSec: number; samples: number }>;

export interface LibraryResponse {
  items: MediaItem[];
  summary: Summary;
  settings: Settings;
  speeds: Speeds;
}

export function summarize(items: MediaItem[]): Summary {
  const s: Summary = { libraryBytes: 0, freedBytes: 0, pendingBytes: 0, stillToFreeBytes: 0, compressedCount: 0, activeCount: 0 };
  for (const x of items) {
    s.libraryBytes += x.originalBytes;
    const saved = x.result ? Math.max(0, x.originalBytes - x.result.outputBytes) : 0;
    if (x.state === 'freed') {
      s.freedBytes += saved;
      s.compressedCount++;
    } else if (x.state === 'ready') {
      s.pendingBytes += saved;
    } else if (x.state === 'new' || ACTIVE_STATES.includes(x.state)) {
      s.stillToFreeBytes += Math.max(0, x.originalBytes - x.estimateBytes);
      if (ACTIVE_STATES.includes(x.state)) s.activeCount++;
    }
  }
  return s;
}
