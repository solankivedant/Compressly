import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { createJob, publicJob, type Job } from '@/lib/jobs';
import { compressImage } from '@/lib/image';
import { compressVideo } from '@/lib/video';
import type { ImageFormat, VideoCodec, VideoPreset } from '@/lib/quality';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

// The file arrives as the raw request body (streamed to disk, never buffered in memory).
export async function POST(req: Request) {
  if (!req.body) return Response.json({ error: 'No file in request body.' }, { status: 400 });
  const url = new URL(req.url);
  const fileName = decodeURIComponent(req.headers.get('x-filename') ?? 'upload.bin');
  const mime = req.headers.get('content-type') ?? '';
  const kind = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : null;
  if (!kind) return Response.json({ error: 'Pick an image or a video file.' }, { status: 400 });

  const job = await createJob(fileName, mime);
  await pipeline(Readable.fromWeb(req.body as unknown as WebReadableStream), fs.createWriteStream(job.inputPath));

  const work =
    kind === 'video'
      ? compressVideo(
          job,
          pick<VideoPreset>(url.searchParams.get('preset'), ['high', 'balanced', 'max'], 'balanced'),
          pick<VideoCodec>(url.searchParams.get('codec'), ['hevc', 'h264'], 'hevc'),
        )
      : compressImage(
          job,
          pick<ImageFormat>(url.searchParams.get('format'), ['jpeg', 'webp', 'avif'], 'jpeg'),
          Math.min(100, Math.max(1, Number(url.searchParams.get('quality')) || 80)),
        );

  // Runs in the background; the browser polls GET /api/jobs/:id.
  work
    .then(() => finish(job))
    .catch((e: Error) => {
      job.status = 'error';
      job.error = e.message;
      job.message = 'Failed';
    });

  return Response.json(publicJob(job), { status: 202 });
}

function finish(job: Job) {
  job.status = 'done';
  job.progress = 1;
  job.message = 'Done';
}
