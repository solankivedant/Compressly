// Shared by server and browser. Mirrors docs/DESIGN.md §5.1 and §5.3.

export type VideoPreset = 'high' | 'balanced' | 'max';
export type VideoCodec = 'hevc' | 'h264';
export type ImageFormat = 'jpeg' | 'webp' | 'avif';

export const VIDEO_PRESETS: Record<VideoPreset, { label: string; minSsim: number }> = {
  high: { label: 'High', minSsim: 0.97 },
  balanced: { label: 'Balanced', minSsim: 0.95 },
  max: { label: 'Max savings', minSsim: 0.92 },
};

// Same threshold as the Balanced video preset; photos have no gate of their own yet.
export const IMAGE_MIN_SSIM = 0.95;

export function qualityWords(ssim: number, minSsim: number): { words: string; tone: 'good' | 'neutral' | 'bad' } {
  if (ssim < minSsim) return { words: 'Below threshold (app would keep the original)', tone: 'bad' };
  if (ssim >= 0.97) return { words: 'Looks identical', tone: 'good' };
  if (ssim >= 0.95) return { words: 'Very close', tone: 'good' };
  return { words: 'Close', tone: 'neutral' };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}
