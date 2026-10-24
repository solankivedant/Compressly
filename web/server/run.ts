import { spawn } from 'node:child_process';

export const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
  }
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command, collecting output. `onStdout` sees each chunk (used for ffmpeg -progress). */
export function run(cmd: string, args: string[], opts: { signal?: AbortSignal; onStdout?: (s: string) => void } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new CancelledError());
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const onAbort = () => child.kill('SIGKILL');
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      if (stdout.length < 1_000_000) stdout += s;
      opts.onStdout?.(s);
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 200_000) stderr = stderr.slice(-50_000);
    });
    child.on('error', (e) => {
      opts.signal?.removeEventListener('abort', onAbort);
      const how = process.platform === 'win32' ? 'winget install Gyan.FFmpeg' : process.platform === 'darwin' ? 'brew install ffmpeg' : 'sudo apt install ffmpeg';
      reject(new Error(`FFmpeg is not installed on this computer. Install it (${how}), then restart the site.`));
    });
    child.on('close', (code) => {
      opts.signal?.removeEventListener('abort', onAbort);
      if (opts.signal?.aborted) reject(new CancelledError());
      else resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

export function lastLines(text: string, n = 2) {
  return text.trim().split(/\r?\n/).slice(-n).join(' ');
}

/** Reads the latest out_time_us from an ffmpeg -progress chunk, as a 0..1 fraction. */
export function progressFrom(chunk: string, durationSec: number): number | null {
  const all = chunk.match(/out_time_us=(\d+)/g);
  if (!all || durationSec <= 0) return null;
  const us = Number(all[all.length - 1].slice('out_time_us='.length));
  return Math.min(0.99, us / (durationSec * 1e6));
}
