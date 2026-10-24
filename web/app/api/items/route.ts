import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebStream } from 'node:stream/web';
import { summarize, type Kind, type LibraryResponse, type MediaItem } from '@/lib/types';
import { estimatePhotoBytes, photoThumb, probePhoto } from '@/server/photo';
import { itemDir, store, thumbPath } from '@/server/store';
import { estimateVideoBytes, probeVideo, videoThumb } from '@/server/video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = store.list();
  const body: LibraryResponse = { items, summary: summarize(items), settings: store.settings(), speeds: store.speeds() };
  return Response.json(body);
}

/** Adds one file. The raw file is the request body; it streams to disk and is never held in memory. */
export async function POST(req: Request) {
  const mime = req.headers.get('content-type') ?? '';
  const kind: Kind | null = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'photo' : null;
  if (!kind || !req.body) return Response.json({ error: 'Choose a photo or a video.' }, { status: 400 });

  const name = decodeURIComponent(req.headers.get('x-filename') ?? 'file').slice(0, 200);
  const ext = path.extname(name).slice(1).toLowerCase().match(/^[a-z0-9]{1,5}$/)?.[0] ?? (kind === 'video' ? 'mp4' : 'jpg');
  const id = crypto.randomUUID();
  const dir = itemDir(id);
  await fsp.mkdir(dir, { recursive: true });
  const original = path.join(dir, `original.${ext}`);

  try {
    await pipeline(Readable.fromWeb(req.body as unknown as NodeWebStream), fs.createWriteStream(original));
    const originalBytes = (await fsp.stat(original)).size;
    const settings = store.settings();
    const base = { id, kind, name, mime, ext, addedAt: Date.now(), originalBytes, state: 'new' as const, progress: 0 };
    let item: MediaItem;

    if (kind === 'video') {
      const p = await probeVideo(original, originalBytes);
      item = { ...base, ...p, estimateBytes: estimateVideoBytes(p, settings, originalBytes) };
      await videoThumb(original, thumbPath(item), p.durationSec).catch(() => {});
    } else {
      const p = await probePhoto(original);
      item = { ...base, width: p.width, height: p.height, estimateBytes: estimatePhotoBytes(originalBytes, settings) };
      await photoThumb(original, thumbPath(item)).catch(() => {});
    }
    store.add(item);
    return Response.json(item, { status: 201 });
  } catch (e) {
    await fsp.rm(dir, { recursive: true, force: true });
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}

/** Clears the whole library (Settings → Clear). */
export async function DELETE() {
  await store.clear();
  return Response.json({ ok: true });
}
