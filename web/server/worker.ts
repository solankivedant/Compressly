import fsp from 'node:fs/promises';
import path from 'node:path';
import { formatEta, formatSize } from '@/lib/format';
import { liveSpeeds, planQueue, speedKey, workPixels } from '@/lib/rules';
import { LANES, type Kind, type Settings } from '@/lib/types';
import { CancelledError } from './run';
import { compressPhoto } from './photo';
import { notify } from './push';
import { itemDir, originalPath, store } from './store';
import { compressVideo } from './video';

/**
 * Runs the queue in lanes: one video at a time (FFmpeg already uses every core, so two would not finish sooner)
 * and two photos at a time beside it. Oldest first within each lane, like the phone's queue.
 */
interface WorkerState {
  jobs: Map<string, { kind: Kind; abort: AbortController }>;
  // The current run of work, for "2 of 5" in notifications. Starts over when the queue empties.
  batch: { total: number; done: number; freed: number; failed: number };
  lastStatusAt: number;
}

const g = globalThis as typeof globalThis & { __compresslyWorker2?: WorkerState };
const w: WorkerState = (g.__compresslyWorker2 ??= { jobs: new Map(), batch: { total: 0, done: 0, freed: 0, failed: 0 }, lastStatusAt: 0 });

export function enqueue(ids: string[], settings: Settings): number {
  let n = 0;
  for (const id of ids) {
    const item = store.get(id);
    if (!item || !['new', 'failed', 'notWorthIt', 'keptOriginal'].includes(item.state)) continue;
    store.update(id, { state: 'queued', progress: 0, queuedWith: { ...settings }, reason: undefined, result: undefined, attempt: undefined });
    n++;
  }
  if (w.jobs.size === 0 && !store.list().some((x) => x.state === 'queued' && !ids.includes(x.id))) {
    w.batch = { total: 0, done: 0, freed: 0, failed: 0 };
  }
  w.batch.total += n;
  pump();
  return n;
}

export function cancel(id: string) {
  w.jobs.get(id)?.abort.abort();
  const item = store.get(id);
  if (item && ['queued', 'compressing', 'checking', 'saving'].includes(item.state)) {
    if (item.state === 'queued') w.batch.total = Math.max(0, w.batch.total - 1);
    store.update(id, { state: 'new', progress: 0, stageStartedAt: undefined });
  }
}

export function isBusy(id: string) {
  return w.jobs.has(id);
}

/** Starts as many waiting files as the lanes allow. Called again whenever a job ends. */
function pump() {
  const queued = store
    .list()
    .filter((x) => x.state === 'queued' && !w.jobs.has(x.id))
    .sort((a, b) => a.addedAt - b.addedAt);
  for (const kind of ['video', 'photo'] as const) {
    let free = LANES[kind] - [...w.jobs.values()].filter((j) => j.kind === kind).length;
    for (const x of queued) {
      if (free <= 0) break;
      if (x.kind !== kind) continue;
      free--;
      const abort = new AbortController();
      w.jobs.set(x.id, { kind, abort });
      void processOne(x.id, abort).finally(() => {
        w.jobs.delete(x.id);
        pump();
        if (w.jobs.size === 0 && !store.list().some((y) => y.state === 'queued')) void allDone();
      });
    }
  }
}

async function processOne(id: string, abort: AbortController) {
  const item = store.get(id)!;
  const settings = item.queuedWith ?? store.settings();
  const startedAt = Date.now();
  const work = workPixels(item);

  // Each stage change records how fast the stage that just ended ran, so estimates learn per stage.
  const stage = (state: 'compressing' | 'checking' | 'saving', progress: number) => {
    if (abort.signal.aborted) return;
    const cur = store.get(id);
    if (!cur) return;
    const now = Date.now();
    const patch: Parameters<typeof store.update>[1] = { state, progress };
    if (cur.state !== state) {
      if (cur.stageStartedAt && item.kind === 'video') {
        const sec = (now - cur.stageStartedAt) / 1000;
        if (cur.state === 'compressing') store.recordSpeed(speedKey('video', settings), work / sec);
        if (cur.state === 'checking') store.recordSpeed('video-check', work / sec);
      }
      patch.stageStartedAt = now;
      if (cur.state === 'checking' && state === 'compressing') patch.attempt = 2; // quality retry
    }
    store.update(id, patch);
    statusUpdate();
  };

  const dir = itemDir(id);
  const outBase = path.join(dir, 'output');
  store.update(id, { startedAt, stageStartedAt: startedAt, attempt: 1 });
  await removeOutputs(dir);

  try {
    const input = originalPath(item);
    const result =
      item.kind === 'video'
        ? await compressVideo(item, input, `${outBase}.mp4`, settings, { signal: abort.signal, stage })
        : await compressPhoto(item, input, outBase, settings, { stage });
    if (abort.signal.aborted) throw new CancelledError();

    if (item.kind === 'photo') store.recordSpeed(speedKey('photo', settings), work / Math.max(0.05, (Date.now() - startedAt) / 1000 - 0.3));

    // The quality gate: the app keeps the original if the copy isn't clearly better.
    let reason: string | undefined;
    if (result.ssim < result.minSsim) reason = `Quality score ${result.ssim.toFixed(4)} is below ${result.minSsim} for this preset.`;
    else if (result.outputBytes >= item.originalBytes) reason = 'The compressed copy would not be smaller.';
    store.update(id, { state: reason ? 'notWorthIt' : 'ready', progress: 1, result, reason, decidedAt: undefined, stageStartedAt: undefined });
    w.batch.done++;
    if (!reason) w.batch.freed += item.originalBytes - result.outputBytes;
    fileDone(item.kind, reason ? null : item.originalBytes - result.outputBytes);
  } catch (e) {
    await removeOutputs(dir);
    if (e instanceof CancelledError || abort.signal.aborted) {
      store.update(id, { state: 'new', progress: 0, result: undefined, stageStartedAt: undefined });
    } else {
      store.update(id, { state: 'failed', progress: 0, result: undefined, reason: (e as Error).message, stageStartedAt: undefined });
      w.batch.done++;
      w.batch.failed++;
      void notify({ title: `A ${item.kind} could not be compressed`, body: 'Open Compressly to see why. The original is untouched.', tag: `failed-${id}`, url: `/media/${id}` });
    }
  }
}

// ---------- Notifications ----------

function queueLeft() {
  const items = store.list();
  const settings = store.settings();
  return planQueue(items, settings, liveSpeeds(items, settings, store.speeds())).total;
}

/** One silent notification that is updated in place as the queue moves, at most every 20 s. */
function statusUpdate(force = false) {
  const now = Date.now();
  if (!force && now - w.lastStatusAt < 20_000) return;
  w.lastStatusAt = now;
  const running = store.list().filter((x) => w.jobs.has(x.id));
  if (!running.length) return;
  const { total, done } = w.batch;
  const parts = running.map((x) => (x.kind === 'video' ? `Video ${x.state === 'checking' ? 'quality check' : 'compressing'} ${Math.round(x.progress * 100)}%` : 'Photo'));
  void notify({
    title: `Compressing ${Math.min(total, done + 1)} of ${total}`,
    body: `${parts.join(' · ')}\n${formatEta(queueLeft())} left for everything`,
    tag: 'status',
    silent: true,
    url: '/compress',
  });
}

function fileDone(kind: Kind, saved: number | null) {
  const { total, done } = w.batch;
  if (done >= total) return; // the "all done" message covers the last one
  void notify({
    title: `${done} of ${total} done`,
    body: `${kind === 'video' ? 'Video' : 'Photo'} ${saved !== null ? `saved ${formatSize(saved)}` : 'kept as is (not worth compressing)'}. ${formatEta(queueLeft())} left.`,
    tag: 'status',
    silent: true,
    url: '/compress',
  });
  w.lastStatusAt = Date.now();
}

async function allDone() {
  const { total, freed, failed } = w.batch;
  if (!total) return;
  await notify({
    title: 'All done',
    body: `${total} ${total === 1 ? 'file' : 'files'} checked${freed > 0 ? ` · ${formatSize(freed)} ready to free` : ''}${failed ? ` · ${failed} could not be compressed` : ''}. Tap to review.`,
    tag: 'status',
    renotify: true,
    url: freed > 0 ? '/review' : '/compress',
  });
  w.batch = { total: 0, done: 0, freed: 0, failed: 0 };
}

async function removeOutputs(dir: string) {
  const names = await fsp.readdir(dir).catch(() => [] as string[]);
  await Promise.all(names.filter((n) => n.startsWith('output.')).map((n) => fsp.rm(path.join(dir, n), { force: true })));
}
