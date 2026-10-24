import type { PushSubscription } from 'web-push';
import { HOSTED } from '@/server/store';
import { notify, push } from '@/server/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The key a browser needs to subscribe, and whether this browser already is. */
export async function GET(req: Request) {
  if (HOSTED) return Response.json({ error: 'Not available on a hosting service.' }, { status: 503 });
  const endpoint = new URL(req.url).searchParams.get('endpoint');
  return Response.json({ publicKey: push.publicKey(), subscribed: endpoint ? push.has(endpoint) : false, devices: push.count() });
}

/** { subscription } turns notifications on for this browser; { test: endpoint } sends a test. */
export async function POST(req: Request) {
  if (HOSTED) return Response.json({ error: 'Not available on a hosting service.' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { subscription?: PushSubscription; test?: string };
  if (body.test) {
    await notify({ title: 'Notifications are on', body: 'You will hear from Compressly as files finish, even with this page closed.', tag: 'test', url: '/settings' }, body.test);
    return Response.json({ ok: true });
  }
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return Response.json({ error: 'Not a push subscription.' }, { status: 400 });
  await push.add(sub);
  return Response.json({ ok: true, devices: push.count() });
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await push.remove(endpoint);
  return Response.json({ ok: true });
}
