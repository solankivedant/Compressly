import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import webpush, { type PushSubscription } from 'web-push';
import { DATA_DIR, HOSTED } from './store';

/**
 * Phone and desktop notifications through the browser's push service, so they arrive even when the
 * Compressly tab is closed or the phone is locked. The signing keys are made on first use and kept in
 * .data/push.json (git-ignored, never printed). Payloads carry counts and sizes only, never file names.
 */
interface PushDb {
  publicKey: string;
  privateKey: string;
  subs: PushSubscription[];
}

export interface Note {
  title: string;
  body: string;
  tag: string;
  url: string;
  silent?: boolean;
  renotify?: boolean;
}

const FILE = path.join(DATA_DIR, 'push.json');
const g = globalThis as typeof globalThis & { __compresslyPush?: PushDb };

function db(): PushDb {
  if (g.__compresslyPush) return g.__compresslyPush;
  let d: PushDb;
  try {
    d = JSON.parse(fs.readFileSync(FILE, 'utf8')) as PushDb;
  } catch {
    const keys = webpush.generateVAPIDKeys();
    d = { publicKey: keys.publicKey, privateKey: keys.privateKey, subs: [] };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(d));
  }
  return (g.__compresslyPush = d);
}

async function save() {
  const tmp = `${FILE}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(db()));
  await fsp.rename(tmp, FILE);
}

export const push = {
  publicKey: () => db().publicKey,
  count: () => db().subs.length,
  has: (endpoint: string) => db().subs.some((s) => s.endpoint === endpoint),
  async add(sub: PushSubscription) {
    const d = db();
    d.subs = [...d.subs.filter((s) => s.endpoint !== sub.endpoint), sub];
    await save();
  },
  async remove(endpoint: string) {
    const d = db();
    d.subs = d.subs.filter((s) => s.endpoint !== endpoint);
    await save();
  },
};

/** Sends to every subscribed browser. Never throws: a missed notification must not fail a job. */
export async function notify(note: Note, only?: string) {
  if (HOSTED) return;
  const d = db();
  const targets = only ? d.subs.filter((s) => s.endpoint === only) : d.subs;
  if (!targets.length) return;
  const gone: string[] = [];
  await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(note), {
          vapidDetails: { subject: process.env.VAPID_SUBJECT || 'mailto:compressly@example.com', publicKey: d.publicKey, privateKey: d.privateKey },
          TTL: 60 * 60,
          urgency: note.silent ? 'low' : 'high',
          topic: note.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined,
        });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(sub.endpoint); // the browser unsubscribed
        else console.warn(`[push] send failed (${code ?? 'network'})`);
      }
    }),
  );
  if (gone.length) {
    d.subs = d.subs.filter((s) => !gone.includes(s.endpoint));
    await save().catch(() => {});
  }
}
