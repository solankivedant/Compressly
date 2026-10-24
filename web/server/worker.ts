import fsp from 'node:fs/promises';
import path from 'node:path';
import { speedKey, workPixels } from '@/lib/rules';
import type { Settings } from '@/lib/types';
import { CancelledError } from './run';
import { compressPhoto } from './photo';
import { itemDir, originalPath, store } from './store';
import { compressVideo } from './video';

/** One job at a time, oldest first, like the phone's queue. */
interface WorkerState {
  running: boolean;
  currentId?: string;
  abort?: AbortController;
}

const g = globalThis as typeof globalThis & { __compresslyWorker?: WorkerState };
const w: WorkerState = (g.__compresslyWorker ??= { running: false });

export function enqueue(ids: string[], settings: Settings): number {
  let n = 0;
  for (const id of ids) {
    const item = store.get(id);
    if (!item || !['new', 'failed', 'notWorthIt', 'keptOriginal'].includes(item.state)) continue;
    store.update(id, { state: 'queued', progress: 0, queuedWith: { ...settings }, reason: undefined, result: undefined });
    n++;
  }
  void pump();
  return n;
}

export function cancel(id: string) {
  if (w.currentId === id) w.abort?.abort();
  const item = store.get(id);
  if (item && ['queued', 'compressing', 'checking', 'saving'].includes(item.state)) {
    store.update(id, { state: 'new', progress: 0 });
  }
}

export function isBusy(id: string) {
  return w.currentId === id;
}

async function pump() {
  if (w.running) return;
  w.running = true;
  try {
    for (;;) {
      const next = store
        .list()
        .filter((x) => x.state === 'queued')
        .sort((a, b) => a.addedAt - b.addedAt)[0];
      if (!next) break;
      await processOne(next.id);
    }
  } finally {
    w.running = false;
    w.currentId = undefined;
    w.abort = undefined;
  }
}

async function processOne(id: string) {
  const item = store.get(id)!;
  const settings = item.queuedWith ?? store.settings();
  const abort = new AbortController();
  w.currentId = id;
  w.abort = abort;

  const stage = (state: 'compressing' | 'checking' | 'saving', progress: number) => {
    if (!abort.signal.aborted) store.update(id, { state, progress });
  };
  const dir = itemDir(id);
  const outBase = path.join(dir, 'output');
  const startedAt = Date.now();
  store.update(id, { startedAt });
  await removeOutputs(dir);

  try {
    const input = originalPath(item);
    const result =
      item.kind === 'video'
        ? await compressVideo(item, input, `${outBase}.mp4`, settings, { signal: abort.signal, stage })
        : await compressPhoto(item, input, outBase, settings, { stage });
    if (abort.signal.aborted) throw new CancelledError();

    // Learn this computer's speed for the next estimates. A retried video did two passes, so it counts double work.
    const passes = result.notes.some((n) => n.includes('retried')) ? 2 : 1;
    store.recordSpeed(speedKey(item.kind, settings), (workPixels(item) * passes) / ((Date.now() - startedAt) / 1000));

    // The quality gate: the app keeps the original if the copy isn't clearly better.
    let reason: string | undefined;
    if (result.ssim < result.minSsim) reason = `Quality score ${result.ssim.toFixed(4)} is below ${result.minSsim} for this preset.`;
    else if (result.outputBytes >= item.originalBytes) reason = 'The compressed copy would not be smaller.';
    store.update(id, { state: reason ? 'notWorthIt' : 'ready', progress: 1, result, reason, decidedAt: undefined });
  } catch (e) {
    await removeOutputs(dir);
    if (e instanceof CancelledError || abort.signal.aborted) {
      store.update(id, { state: 'new', progress: 0, result: undefined });
    } else {
      store.update(id, { state: 'failed', progress: 0, result: undefined, reason: (e as Error).message });
    }
  } finally {
    w.currentId = undefined;
    w.abort = undefined;
  }
}

async function removeOutputs(dir: string) {
  const names = await fsp.readdir(dir).catch(() => [] as string[]);
  await Promise.all(names.filter((n) => n.startsWith('output.')).map((n) => fsp.rm(path.join(dir, n), { force: true })));
}
