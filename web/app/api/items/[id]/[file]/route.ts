import path from 'node:path';
import { originalPath, outputPath, store, thumbPath } from '@/server/store';
import { serveFile } from '@/server/serve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/items/:id/original | output | thumb   (add ?download to save the file) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const item = store.get(id);
  if (!item) return new Response('Not found', { status: 404 });
  const download = new URL(req.url).searchParams.has('download');
  const stem = path.parse(item.name).name;

  if (file === 'thumb') return serveFile(req, thumbPath(item), 'image/jpeg');
  if (file === 'original') return serveFile(req, originalPath(item), item.mime, download ? item.name : undefined);
  if (file === 'output' && item.result && ['ready', 'freed', 'notWorthIt'].includes(item.state)) {
    const r = item.result;
    return serveFile(req, outputPath(item), r.outputMime, download ? `${stem}-compressed.${r.outputExt}` : undefined);
  }
  return new Response('Not found', { status: 404 });
}
