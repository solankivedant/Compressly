import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebStream } from 'node:stream/web';
import { summarize, type Kind, type LibraryResponse, type MediaItem } from '@/lib/types';
import { estimatePhotoBytes, photoThumb, probePhoto } from '@/server/photo';
import { HOSTED, HostedError, itemDir, store, thumbPath } from '@/server/store';
import { estimateVideoBytes, probeVideo, videoThumb } from '@/server/video';

export const runtime = 'nodejs';

const VIDEO_EXT = /^\.(mp4|mov|m4v|mkv|webm|avi|3gp)$/;
const PHOTO_EXT = /^\.(jpe?g|png|webp|avif|heic|heif|tiff?|gif|bmp)$/;
export const dynamic = 'force-dynamic';

const hostedReply = () => Response.json({ error: new HostedError().message, hosted: true }, { status: 503 });

export async function GET() {
  if (HOSTED) return hostedReply();
  const items = store.list();
  const body: LibraryResponse = { items, summary: summarize(items), settings: store.settings(), speeds: store.speeds() };
  return Response.json(body);
}

/** Adds one file. The raw file is the request body; it streams to disk and is never held in memory. */
export async function POST(req: Request) {
  if (HOSTED) return hostedReply();
  const name = decodeURIComponent(req.headers.get('x-filename') ?? 'file').slice(0, 200);
  let mime = req.headers.get('content-type') ?? '';
  // Some phones send gallery files without a type; go by the extension instead.
  if (!/^(video|image)\//.test(mime)) {
    const e = path.extname(name).toLowerCase();
    mime = VIDEO_EXT.test(e) ? 'video/mp4' : PHOTO_EXT.test(e) ? 'image/jpeg' : '';
  }
  const kind: Kind | null = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'photo' : null;
  if (!kind || !req.body) return Response.json({ error: 'Choose a photo or a video.' }, { status: 400 });

  const ext = path.extname(name).slice(1).toLowerCase().match(/^[a-z0-9]{1,5}$/)?.[0] ?? (kind === 'video' ? 'mp4' : 'jpg');
  const fromPhone = req.headers.get('x-from-phone') === '1';
  const id = crypto.randomUUID();
  const dir = itemDir(id);
  await fsp.mkdir(dir, { recursive: true });
  const original = path.join(dir, `original.${ext}`);

  try {
    await pipeline(Readable.fromWeb(req.body as unknown as NodeWebStream), fs.createWriteStream(original));
    const originalBytes = (await fsp.stat(original)).size;
    const settings = store.settings();
    const base = { id, kind, name, mime, ext, addedAt: Date.now(), originalBytes, state: 'new' as const, progress: 0, fromPhone };
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
  if (HOSTED) return hostedReply();
  await store.clear();
  return Response.json({ ok: true });
}
