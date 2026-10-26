import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export type JobStatus = 'uploaded' | 'encoding' | 'checking' | 'done' | 'error';

export interface JobResult {
  kind: 'image' | 'video';
  originalBytes: number;
  outputBytes: number;
  width: number;
  height: number;
  ssim: number;
  minSsim: number;
  passed: boolean;
  seconds: number;
  outputMime: string;
  outputExt: string;
  notes: string[];
  // Video only
  codec?: string;
  sourceKbps?: number;
  targetKbps?: number;
  fps?: number;
  durationSec?: number;
}

export interface Job {
  id: string;
  dir: string;
  inputPath: string;
  inputMime: string;
  outputPath?: string;
  status: JobStatus;
  progress: number; // 0..1 for the current stage
  message: string;
  createdAt: number;
  result?: JobResult;
  error?: string;
}

const ROOT = path.join(os.tmpdir(), 'compressly-web-tester');
const MAX_AGE_MS = 60 * 60 * 1000;

// Kept on globalThis so jobs survive Next.js hot reloads in dev.
const store: Map<string, Job> =
  ((globalThis as Record<string, unknown>).__compresslyJobs as Map<string, Job>) ??
  ((globalThis as Record<string, unknown>).__compresslyJobs = new Map<string, Job>());

export async function createJob(fileName: string, mime: string): Promise<Job> {
  await cleanupOld();
  const id = crypto.randomUUID();
  const dir = path.join(ROOT, id);
  await fs.mkdir(dir, { recursive: true });
  const ext = (path.extname(fileName).slice(1).toLowerCase().match(/^[a-z0-9]{1,5}$/)?.[0]) ?? 'bin';
  const job: Job = {
    id,
    dir,
    inputPath: path.join(dir, `input.${ext}`),
    inputMime: mime || 'application/octet-stream',
    status: 'uploaded',
    progress: 0,
    message: 'Uploaded',
    createdAt: Date.now(),
  };
  store.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function publicJob(job: Job) {
  const { id, status, progress, message, result, error } = job;
  return { id, status, progress, message, result, error };
}

async function cleanupOld() {
  const now = Date.now();
  for (const [id, job] of store) {
    if (now - job.createdAt > MAX_AGE_MS) {
      store.delete(id);
      await fs.rm(job.dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
