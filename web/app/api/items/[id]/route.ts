import fsp from 'node:fs/promises';
import { outputPath, store } from '@/server/store';
import { cancel } from '@/server/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const item = store.get((await params).id);
  return item ? Response.json(item) : Response.json({ error: 'Not found' }, { status: 404 });
}

/**
 * The user's decision on a ready file:
 * - accept: use the compressed copy (the app's "Remove originals")
 * - keepOriginal: discard the compressed copy (the app's "Keep original instead")
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const item = store.get(id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  const { action } = (await req.json()) as { action?: string };

  if (action === 'accept' && item.state === 'ready') {
    return Response.json(store.update(id, { state: 'freed', decidedAt: Date.now() }));
  }
  if (action === 'keepOriginal' && (item.state === 'ready' || item.state === 'freed')) {
    await fsp.rm(outputPath(item), { force: true });
    return Response.json(store.update(id, { state: 'keptOriginal', decidedAt: Date.now() }));
  }
  return Response.json({ error: `Can't ${action ?? 'do that'} while the file is ${item.state}.` }, { status: 409 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = (await params).id;
  cancel(id);
  await store.remove(id);
  return Response.json({ ok: true });
}
