import { store } from '@/server/store';
import { cancel, enqueue } from '@/server/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Queue files with the current settings. Body: { ids: string[] } */
export async function POST(req: Request) {
  const { ids } = (await req.json()) as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) return Response.json({ error: 'No files chosen.' }, { status: 400 });
  return Response.json({ queued: enqueue(ids, store.settings()) });
}

/** Cancel a queued or running file: DELETE /api/queue?id=… */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  cancel(id);
  return Response.json({ ok: true });
}
