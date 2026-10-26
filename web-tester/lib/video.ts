import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Job } from './jobs';
import { VIDEO_PRESETS, type VideoCodec, type VideoPreset } from './quality';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

interface Probe {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  bitrateKbps: number;
  hasAudio: boolean;
}

function run(cmd: string, args: string[], onStdout?: (chunk: string) => void): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let stderr = '';
    let stdout = '';
    p.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      onStdout?.(s);
    });
    p.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });
    p.on('error', (e) =>
      reject(new Error(`Could not start ${cmd}. Install FFmpeg or set FFMPEG_PATH / FFPROBE_PATH. (${e.message})`)),
    );
    p.on('close', (code) => resolve({ code: code ?? -1, stderr, stdout }));
  });
}

function parseRate(r?: string): number {
  if (!r) return 0;
  const [n, d] = r.split('/').map(Number);
  return d ? n / d : n || 0;
}

async function probe(file: string): Promise<Probe> {
  const { code, stdout, stderr } = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
  if (code !== 0) throw new Error(`ffprobe failed: ${stderr.trim().split('\n').pop()}`);
  const info = JSON.parse(stdout);
  const v = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
  if (!v) throw new Error('No video stream found in this file.');
  const durationSec = Number(v.duration ?? info.format.duration ?? 0);
  // Prefer the video stream's own bitrate; fall back to the container's.
  let bitrateKbps = Number(v.bit_rate ?? 0) / 1000;
  if (!bitrateKbps) {
    const stat = await fs.stat(file);
    bitrateKbps = Number(info.format.bit_rate ?? 0) / 1000 || (stat.size * 8) / 1000 / Math.max(durationSec, 0.1);
  }
  // ffmpeg auto-rotates on decode, so a 90° phone video comes out with width and height swapped.
  const rotation = Math.abs(
    Number(v.side_data_list?.find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0),
  );
  const swap = rotation === 90 || rotation === 270;
  return {
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    fps: parseRate(v.avg_frame_rate) || parseRate(v.r_frame_rate) || 30,
    durationSec,
    bitrateKbps,
    hasAudio: info.streams.some((s: { codec_type: string }) => s.codec_type === 'audio'),
  };
}

// DESIGN.md §5.1 table, values in Mbps.
const TABLE: Record<VideoPreset, { k4: [number, number]; p1080: [number, number] }> = {
  high: { k4: [40, 60], p1080: [12, 18] },
  balanced: { k4: [28, 42], p1080: [8, 12] },
  max: { k4: [18, 28], p1080: [5, 8] },
};

export function targetKbps(preset: VideoPreset, codec: VideoCodec, p: Probe): { kbps: number; capped: boolean } {
  const lerpFps = ([at30, at60]: [number, number]) => at30 + ((at60 - at30) * (p.fps - 30)) / 30;
  const pixels = p.width * p.height;
  let mbps: number;
  if (pixels === 3840 * 2160) {
    mbps = lerpFps(TABLE[preset].k4);
  } else {
    mbps = lerpFps(TABLE[preset].p1080) * (pixels / (1920 * 1080));
  }
  mbps = Math.min(60, Math.max(2, mbps));
  const capped = p.bitrateKbps * 0.6 < mbps * 1000;
  let kbps = Math.min(mbps * 1000, p.bitrateKbps * 0.6);
  if (codec === 'h264') kbps *= 1.4;
  return { kbps: Math.round(kbps), capped };
}

async function encode(job: Job, p: Probe, codec: VideoCodec, kbps: number, out: string, copyAudio: boolean) {
  const gop = Math.max(1, Math.round(p.fps * 2));
  const videoArgs =
    codec === 'hevc'
      ? ['-c:v', 'libx265', '-preset', 'fast', '-tag:v', 'hvc1', '-x265-params', 'log-level=error']
      : ['-c:v', 'libx264', '-preset', 'medium'];
  const audioArgs = !p.hasAudio ? [] : copyAudio ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k', '-ac', '2'];
  const args = [
    '-y', '-hide_banner', '-nostats', '-progress', 'pipe:1',
    '-i', job.inputPath,
    '-map', '0:v:0', '-map', '0:a?',
    ...videoArgs,
    '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.5)}k`, '-bufsize', `${kbps * 2}k`,
    '-g', String(gop), '-pix_fmt', 'yuv420p',
    ...audioArgs,
    '-map_metadata', '0', '-movflags', '+faststart',
    out,
  ];
  const totalUs = p.durationSec * 1e6;
  const { code, stderr } = await run(FFMPEG, args, (chunk) => {
    const m = chunk.match(/out_time_us=(\d+)/g);
    if (m && totalUs > 0) {
      const us = Number(m[m.length - 1].split('=')[1]);
      job.progress = Math.min(0.99, us / totalUs);
    }
  });
  return { ok: code === 0, stderr };
}

async function measureSsim(job: Job, out: string, durationSec: number): Promise<number> {
  const { code, stderr } = await run(FFMPEG, [
    '-hide_banner', '-nostats', '-progress', 'pipe:1',
    '-i', out, '-i', job.inputPath,
    '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-',
  ], (chunk) => {
    const m = chunk.match(/out_time_us=(\d+)/g);
    if (m && durationSec > 0) job.progress = Math.min(0.99, Number(m[m.length - 1].split('=')[1]) / (durationSec * 1e6));
  });
  const m = stderr.match(/All:([\d.]+)/);
  if (code !== 0 || !m) throw new Error(`SSIM check failed: ${stderr.trim().split('\n').pop()}`);
  return Number(m[1]);
}

export async function compressVideo(job: Job, preset: VideoPreset, codec: VideoCodec) {
  const started = Date.now();
  const notes: string[] = [];
  const p = await probe(job.inputPath);
  const minSsim = VIDEO_PRESETS[preset].minSsim;
  const out = path.join(job.dir, 'output.mp4');
  const target = targetKbps(preset, codec, p);
  let kbps = target.kbps;
  let ssim = 0;

  // One retry at +25% bitrate if the quality gate fails (DESIGN.md §5.1).
  for (let attempt = 0; attempt < 2; attempt++) {
    job.status = 'encoding';
    job.progress = 0;
    job.message = `Encoding ${codec.toUpperCase()} at ${(kbps / 1000).toFixed(1)} Mbps${attempt ? ' (retry)' : ''}`;
    let res = await encode(job, p, codec, kbps, out, true);
    if (!res.ok && p.hasAudio) {
      notes.push('Audio could not be copied, re-encoded to AAC 192 kbps.');
      res = await encode(job, p, codec, kbps, out, false);
    }
    if (!res.ok) throw new Error(`ffmpeg failed: ${res.stderr.trim().split('\n').slice(-3).join(' ')}`);

    job.status = 'checking';
    job.progress = 0;
    job.message = 'Measuring SSIM against the original';
    ssim = await measureSsim(job, out, p.durationSec);
    if (ssim >= minSsim || attempt === 1) break;
    notes.push(`First pass SSIM ${ssim.toFixed(4)} was below ${minSsim}; retried at +25% bitrate.`);
    kbps = Math.round(kbps * 1.25);
  }

  const [inStat, outStat] = await Promise.all([fs.stat(job.inputPath), fs.stat(out)]);
  if (outStat.size >= inStat.size) notes.push('Output is not smaller than the original. The app would skip this file.');
  if (target.capped) {
    notes.push('Source bitrate is already low, so the target was capped at 60% of it.');
  }

  job.outputPath = out;
  job.result = {
    kind: 'video',
    originalBytes: inStat.size,
    outputBytes: outStat.size,
    width: p.width,
    height: p.height,
    ssim,
    minSsim,
    passed: ssim >= minSsim && outStat.size < inStat.size,
    seconds: (Date.now() - started) / 1000,
    outputMime: 'video/mp4',
    outputExt: 'mp4',
    notes,
    codec: codec === 'hevc' ? 'HEVC (H.265)' : 'H.264',
    sourceKbps: Math.round(p.bitrateKbps),
    targetKbps: kbps,
    fps: Math.round(p.fps * 100) / 100,
    durationSec: p.durationSec,
  };
}
