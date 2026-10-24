import fsp from 'node:fs/promises';
import { PRESETS, videoTargetKbps } from '@/lib/rules';
import type { ItemResult, MediaItem, Settings } from '@/lib/types';
import { FFMPEG, FFPROBE, lastLines, progressFrom, run } from './run';

export interface VideoProbe {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  bitrateKbps: number;
  sourceCodec: string;
  hasAudio: boolean;
  audioKbps: number;
}

const rate = (r?: string) => {
  if (!r) return 0;
  const [n, d] = r.split('/').map(Number);
  return d ? n / d : n || 0;
};

export async function probeVideo(file: string, sizeBytes: number): Promise<VideoProbe> {
  const { code, stdout, stderr } = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
  // Drop the file path from FFmpeg's message (no paths in errors).
  if (code !== 0) throw new Error(`Could not read this video. ${lastLines(stderr, 1).split(file).join('').replace(/^[:\s]+/, '')}`);
  const info = JSON.parse(stdout);
  type Stream = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const v: Stream | undefined = info.streams.find((s: Stream) => s.codec_type === 'video');
  const a: Stream | undefined = info.streams.find((s: Stream) => s.codec_type === 'audio');
  if (!v) throw new Error('This file has no video track.');

  const durationSec = Number(v.duration ?? info.format?.duration ?? 0);
  const audioKbps = a ? Number(a.bit_rate ?? 128_000) / 1000 : 0;
  let bitrateKbps = Number(v.bit_rate ?? 0) / 1000;
  if (!bitrateKbps) {
    const total = Number(info.format?.bit_rate ?? 0) / 1000 || (sizeBytes * 8) / 1000 / Math.max(durationSec, 0.1);
    bitrateKbps = Math.max(1, total - audioKbps);
  }
  // FFmpeg turns phone videos upright when decoding, so report the upright size.
  const rotation = Math.abs(Number(v.side_data_list?.find((d: Stream) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0));
  const sideways = rotation === 90 || rotation === 270;
  return {
    width: sideways ? v.height : v.width,
    height: sideways ? v.width : v.height,
    fps: Math.round((rate(v.avg_frame_rate) || rate(v.r_frame_rate) || 30) * 100) / 100,
    durationSec,
    bitrateKbps: Math.round(bitrateKbps),
    sourceCodec: String(v.codec_name ?? 'unknown').toUpperCase(),
    hasAudio: !!a,
    audioKbps,
  };
}

export async function videoThumb(file: string, out: string, durationSec: number) {
  const at = Math.min(1, durationSec / 3).toFixed(2);
  const { code, stderr } = await run(FFMPEG, ['-y', '-v', 'error', '-ss', at, '-i', file, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', out]);
  if (code !== 0) throw new Error(`Could not make a thumbnail. ${lastLines(stderr, 1)}`);
}

export function estimateVideoBytes(p: VideoProbe, s: Settings, originalBytes: number) {
  const { kbps } = videoTargetKbps(s.preset, s.videoCodec, p);
  const bytes = ((kbps + p.audioKbps) * 1000 * p.durationSec) / 8;
  return Math.round(Math.min(originalBytes, bytes));
}

interface Hooks {
  signal: AbortSignal;
  stage: (state: 'compressing' | 'checking' | 'saving', progress: number) => void;
}

async function encode(input: string, out: string, item: MediaItem, s: Settings, kbps: number, copyAudio: boolean, h: Hooks) {
  const fps = item.fps ?? 30;
  const codecArgs =
    s.videoCodec === 'hevc'
      ? ['-c:v', 'libx265', '-preset', 'fast', '-tag:v', 'hvc1', '-x265-params', 'log-level=error']
      : ['-c:v', 'libx264', '-preset', 'medium'];
  const audioArgs = !item.hasAudio ? ['-an'] : copyAudio ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k', '-ac', '2'];
  const args = [
    '-y', '-hide_banner', '-nostats', '-progress', 'pipe:1',
    '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    ...codecArgs,
    '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.5)}k`, '-bufsize', `${kbps * 2}k`,
    '-g', String(Math.max(1, Math.round(fps * 2))), // keyframe every 2 s
    '-pix_fmt', 'yuv420p',
    ...audioArgs,
    '-map_metadata', '0', '-movflags', '+faststart',
    out,
  ];
  return run(FFMPEG, args, {
    signal: h.signal,
    onStdout: (c) => {
      const p = progressFrom(c, item.durationSec ?? 0);
      if (p !== null) h.stage('compressing', p);
    },
  });
}

async function measureSsim(output: string, input: string, durationSec: number, h: Hooks): Promise<number> {
  const { code, stderr } = await run(
    FFMPEG,
    ['-hide_banner', '-nostats', '-progress', 'pipe:1', '-i', output, '-i', input, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'],
    {
      signal: h.signal,
      onStdout: (c) => {
        const p = progressFrom(c, durationSec);
        if (p !== null) h.stage('checking', p);
      },
    },
  );
  const m = stderr.match(/All:([\d.]+)/);
  if (code !== 0 || !m) throw new Error(`Quality check failed. ${lastLines(stderr)}`);
  return Number(m[1]);
}

/** Same resolution and frame rate; one retry at +25% bitrate if the quality gate fails (DESIGN §5.1). */
export async function compressVideo(item: MediaItem, input: string, out: string, s: Settings, h: Hooks): Promise<ItemResult> {
  const started = Date.now();
  const notes: string[] = [];
  const minSsim = PRESETS[s.preset].minSsim;
  const target = videoTargetKbps(s.preset, s.videoCodec, {
    width: item.width,
    height: item.height,
    fps: item.fps ?? 30,
    bitrateKbps: item.bitrateKbps ?? 0,
  });
  if (target.capped) notes.push('The source bitrate is already low, so the target was capped at 60% of it.');
  let kbps = target.kbps;
  let ssim = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    h.stage('compressing', 0);
    let r = await encode(input, out, item, s, kbps, true, h);
    if (r.code !== 0 && item.hasAudio) {
      notes.push('Audio could not be copied as is, so it was re-encoded to AAC 192 kbps.');
      r = await encode(input, out, item, s, kbps, false, h);
    }
    if (r.code !== 0) throw new Error(`Compression failed. ${lastLines(r.stderr, 3)}`);

    h.stage('checking', 0);
    ssim = await measureSsim(out, input, item.durationSec ?? 0, h);
    if (ssim >= minSsim || attempt === 1) break;
    notes.push(`First try scored ${ssim.toFixed(4)} (needs ${minSsim}), so it was retried at +25% bitrate.`);
    kbps = Math.round(kbps * 1.25);
  }

  h.stage('saving', 0.5);
  const outputBytes = (await fsp.stat(out)).size;
  return {
    outputBytes,
    outputExt: 'mp4',
    outputMime: 'video/mp4',
    ssim,
    minSsim,
    preset: s.preset,
    method: `${s.videoCodec === 'hevc' ? 'HEVC' : 'H.264'} · ${(kbps / 1000).toFixed(1)} Mbps`,
    targetKbps: kbps,
    seconds: (Date.now() - started) / 1000,
    notes,
    finishedAt: Date.now(),
  };
}
