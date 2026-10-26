'use client';

// Runs the library on this device: adding files, the queue (one video and two photos at a time, each in its own
// worker), learning this device's speed, notifications, keeping the screen awake, and replacing originals in folders.

import { formatEta, formatSize } from '@/lib/format';
import { DEFAULT_SPEEDS, DOC_EXT, checkPixels, estimateBytes, liveSpeeds, planQueue, speedKey, withFormat, workPixels } from '@/lib/rules';
import {
  ACTIVE_STATES,
  LANES,
  summarize,
  type JobIn,
  type JobOut,
  type FormatChoice,
  type Kind,
  type LibraryResponse,
  type MediaItem,
  type Settings,
  type SpeedKey,
  type Speeds,
} from '@/lib/types';
import { db, type OriginalLink } from './db';
import { notify } from './notify';
import { clearOutputs, readOutput, removeOutput } from './opfs';
import { probeDoc, probePhoto, probeVideo } from './probe';

// JPEG by default on the web: only a same-type file can be written over the original on a phone.
const DEFAULT_SETTINGS: Settings = { preset: 'balanced', videoCodec: 'hevc', photoFormat: 'jpeg' };
const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|3gp)$/i;
const PHOTO_EXT = /\.(jpe?g|png|webp|avif|heic|heif|gif|bmp)$/i;

export function mediaKind(f: { name: string; type?: string }): Kind | null {
  if (DOC_EXT.test(f.name)) return 'doc';
  if (f.type?.startsWith('video/') || VIDEO_EXT.test(f.name)) return 'video';
  if (f.type?.startsWith('image/') || PHOTO_EXT.test(f.name)) return 'photo';
  return null;
}

type Availability = 'here' | 'folder' | 'gone';

interface Slot {
  kind: Kind;
  worker: Worker;
  job?: string;
}

interface Batch {
  total: number;
  done: number;
  freed: number;
  failed: number;
}

type WakeLock = { release: () => Promise<void>; released?: boolean };

class Engine {
  items: MediaItem[] = [];
  settings: Settings = { ...DEFAULT_SETTINGS };
  speeds: Speeds = structuredClone(DEFAULT_SPEEDS);
  loaded = false;
  loadError = '';
  private snapshot: LibraryResponse | null = null;
  private listeners = new Set<() => void>();
  private originals = new Map<string, File>(); // files picked this visit
  private links = new Map<string, OriginalLink>(); // files in opened folders (kept between visits)
  private slots: Slot[] = [];
  private batch: Batch = { total: 0, done: 0, freed: 0, failed: 0 };
  private lastStatusAt = 0;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private wake: WakeLock | null = null;

  // ---------- React wiring ----------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private emit(save = true) {
    const items = [...this.items].sort((a, b) => b.addedAt - a.addedAt);
    this.snapshot = { items, summary: summarize(items), settings: this.settings, speeds: this.speeds };
    this.listeners.forEach((l) => l());
    if (save) this.scheduleSave();
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void db.put('kv', 'library', { items: this.items, settings: this.settings, speeds: this.speeds, v: 2 }).catch(() => {});
    }, 300);
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const saved = await db.get<{ items: MediaItem[]; settings: Settings; speeds: Speeds }>('kv', 'library');
      if (saved) {
        this.items = saved.items ?? [];
        this.settings = { ...DEFAULT_SETTINGS, ...saved.settings };
        // Libraries from before v2 had HEIC as the default photo format, which can't replace originals.
        if (!(saved as { v?: number }).v) this.settings.photoFormat = 'jpeg';
        this.speeds = { ...structuredClone(DEFAULT_SPEEDS), ...saved.speeds };
      }
      // Jobs that were running when the page closed go back to "not compressed yet".
      for (const x of this.items) {
        // Earlier versions turned down smaller copies that missed the quality bar; offer them now.
        if (x.state === 'notWorthIt' && x.result && x.result.outputBytes < x.originalBytes) Object.assign(x, { state: 'ready', reason: undefined });
        if (ACTIVE_STATES.includes(x.state)) Object.assign(x, { state: 'new', progress: 0, stageStartedAt: undefined, attempt: undefined });
        if (x.inFolder) {
          const link = await db.get<OriginalLink>('handles', x.id).catch(() => undefined);
          if (link) this.links.set(x.id, link);
        }
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.activeCount()) void this.keepAwake(true);
      });
    } catch (e) {
      this.loadError = `This browser blocked on-device storage (${(e as Error).message}). Private browsing can cause this.`;
    }
    this.emit(false);
  }

  private activeCount() {
    return this.items.filter((x) => ACTIVE_STATES.includes(x.state)).length;
  }

  get(id: string) {
    return this.items.find((x) => x.id === id);
  }

  private update(id: string, patch: Partial<MediaItem>) {
    const i = this.items.findIndex((x) => x.id === id);
    if (i < 0) return;
    this.items[i] = { ...this.items[i], ...patch };
    this.emit();
  }

  // ---------- Originals ----------

  availability(id: string): Availability {
    if (this.originals.has(id)) return 'here';
    if (this.links.has(id)) return 'folder';
    return 'gone';
  }

  /** The original file, if this visit still has it. Folder files may need the user's OK again after a reload. */
  async original(id: string, ask = false): Promise<File | null> {
    const f = this.originals.get(id);
    if (f) return f;
    const link = this.links.get(id);
    if (!link) return null;
    const h = link.file as FileSystemFileHandle & PermissionHandle;
    let p = (await h.queryPermission?.({ mode: 'read' })) ?? 'granted';
    if (p !== 'granted' && ask) p = (await h.requestPermission?.({ mode: 'read' })) ?? 'denied';
    if (p !== 'granted') return null;
    try {
      return await link.file.getFile();
    } catch {
      return null; // moved or deleted outside Compressly
    }
  }

  output(id: string) {
    const x = this.get(id);
    return x?.result ? readOutput(id, x.result.outputExt) : Promise.resolve(null);
  }

  // ---------- Adding ----------

  /** Adds files picked from the gallery / file picker, or found in an opened folder. Returns plain-language problems. */
  async add(files: { file: File; link?: OriginalLink; path?: string }[], opts: { fromPhone: boolean; onEach?: (done: number) => void }) {
    const problems: string[] = [];
    void navigator.storage?.persist?.().catch(() => {});
    let done = 0;
    for (const { file, link, path } of files) {
      const kind = mediaKind(file);
      if (!kind) continue;
      // The same folder file twice is skipped.
      if (path && this.items.some((x) => x.inFolder && x.folderPath === path && x.originalBytes === file.size)) {
        opts.onEach?.(++done);
        continue;
      }
      try {
        const p = kind === 'video' ? await probeVideo(file) : kind === 'doc' ? await probeDoc() : await probePhoto(file);
        const id = crypto.randomUUID();
        const { thumb, kind: _k, ...meta } = p;
        const item: MediaItem = {
          id,
          kind,
          name: file.name,
          mime: file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          ext: file.name.split('.').pop()?.toLowerCase() ?? '',
          addedAt: Date.now() + done, // keeps the picked order
          originalBytes: file.size,
          ...meta,
          estimateBytes: 0,
          state: 'new',
          progress: 0,
          fromPhone: opts.fromPhone,
          inFolder: !!link,
          folderPath: path,
        };
        item.estimateBytes = estimateBytes(item, this.settings);
        this.originals.set(id, file);
        if (link) {
          this.links.set(id, link);
          await db.put('handles', id, link).catch(() => {});
        }
        if (thumb) await db.put('thumbs', id, thumb).catch(() => {});
        this.items.push(item);
        this.emit();
      } catch (e) {
        problems.push(`${file.name}: ${(e as Error).message}`);
      }
      opts.onEach?.(++done);
    }
    return problems;
  }

  // ---------- Queue ----------

  async enqueue(ids: string[]) {
    let n = 0;
    const missing: string[] = [];
    for (const id of ids) {
      const x = this.get(id);
      if (!x || !['new', 'failed', 'notWorthIt', 'keptOriginal'].includes(x.state)) continue;
      const file = await this.original(id, true);
      if (!file) {
        missing.push(x.name);
        continue;
      }
      this.originals.set(id, file);
      this.update(id, { state: 'queued', progress: 0, queuedWith: withFormat(x, this.settings), reason: undefined, result: undefined, attempt: undefined });
      n++;
    }
    if (n && !this.slots.some((s) => s.job) && !this.items.some((x) => x.state === 'queued' && !ids.includes(x.id))) {
      this.batch = { total: 0, done: 0, freed: 0, failed: 0 };
    }
    this.batch.total += n;
    if (n) void this.keepAwake(true);
    this.pump();
    return { queued: n, missing };
  }

  cancel(id: string) {
    const slot = this.slots.find((s) => s.job === id);
    if (slot) slot.worker.postMessage({ type: 'cancel', id } satisfies JobIn);
    const x = this.get(id);
    if (x && ACTIVE_STATES.includes(x.state)) {
      if (x.state === 'queued') this.batch.total = Math.max(0, this.batch.total - 1);
      this.update(id, { state: 'new', progress: 0, stageStartedAt: undefined });
    }
    if (!slot) this.afterJob();
  }

  private slotFor(kind: Kind): Slot | null {
    const free = this.slots.find((s) => s.kind === kind && !s.job);
    if (free) return free;
    if (this.slots.filter((s) => s.kind === kind).length >= LANES[kind]) return null;
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const slot: Slot = { kind, worker };
    worker.onmessage = (e: MessageEvent<JobOut>) => this.onWorker(slot, e.data);
    worker.onerror = (e) => {
      if (slot.job) this.fail(slot.job, `The compression engine stopped (${e.message || 'out of memory?'}).`);
      worker.terminate();
      this.slots = this.slots.filter((s) => s !== slot);
      this.afterJob();
    };
    this.slots.push(slot);
    return slot;
  }

  private pump() {
    const queued = this.items.filter((x) => x.state === 'queued').sort((a, b) => a.addedAt - b.addedAt);
    for (const x of queued) {
      const slot = this.slotFor(x.kind);
      if (!slot) continue;
      const file = this.originals.get(x.id);
      if (!file) {
        this.fail(x.id, 'The original file is no longer available. Add it again.');
        continue;
      }
      slot.job = x.id;
      const now = Date.now();
      this.update(x.id, { state: 'compressing', progress: 0, startedAt: now, stageStartedAt: now, attempt: 1 });
      slot.worker.postMessage({ type: 'job', id: x.id, item: this.get(x.id)!, file, settings: x.queuedWith ?? this.settings } satisfies JobIn);
    }
  }

  private onWorker(slot: Slot, m: JobOut) {
    const x = this.get(m.id);
    if (m.type === 'stage') {
      if (!x || !ACTIVE_STATES.includes(x.state)) return;
      const patch: Partial<MediaItem> = { state: m.state, progress: m.progress };
      if (x.state !== m.state) {
        const now = Date.now();
        // Each stage that ends teaches the estimates how fast this device ran it.
        if (x.kind === 'video' && x.stageStartedAt) {
          const sec = (now - x.stageStartedAt) / 1000;
          const s = x.queuedWith ?? this.settings;
          if (x.state === 'compressing') this.recordSpeed(speedKey('video', s), workPixels(x) / sec);
          if (x.state === 'checking') this.recordSpeed('video-check', checkPixels(x) / sec);
        }
        patch.stageStartedAt = now;
        if (x.state === 'checking' && m.state === 'compressing') patch.attempt = 2;
      }
      this.update(m.id, patch);
      this.statusUpdate();
      return;
    }
    slot.job = undefined;
    if (!x) return this.afterJob();
    if (m.type === 'done') {
      const r = m.result;
      if (x.kind !== 'video' && x.startedAt) {
        this.recordSpeed(speedKey(x.kind, x.queuedWith ?? this.settings), workPixels(x) / Math.max(0.05, (Date.now() - x.startedAt) / 1000 - 0.3));
      }
      // Only "not smaller" is a dead end. A copy below the quality bar is still offered, with a "check closely"
      // warning, so the user can zoom in and decide (the web version is for judging results by eye).
      const reason = r.outputBytes >= x.originalBytes ? 'The compressed copy would not be smaller.' : undefined;
      this.update(m.id, { state: reason ? 'notWorthIt' : 'ready', progress: 1, result: r, reason, decidedAt: undefined, keptBoth: undefined, stageStartedAt: undefined });
      this.batch.done++;
      if (!reason) this.batch.freed += x.originalBytes - r.outputBytes;
      this.fileDone(x.kind, reason ? null : x.originalBytes - r.outputBytes);
    } else if (m.cancelled) {
      void removeOutput(m.id);
    } else {
      this.fail(m.id, m.message);
    }
    this.afterJob();
  }

  private fail(id: string, reason: string) {
    void removeOutput(id);
    const x = this.get(id);
    this.update(id, { state: 'failed', progress: 0, result: undefined, reason, stageStartedAt: undefined });
    this.batch.done++;
    this.batch.failed++;
    void notify({ title: `A ${x?.kind ?? 'file'} could not be compressed`, body: 'Open Compressly to see why. The original is untouched.', tag: `failed-${id}`, url: `/media/${id}` });
  }

  private afterJob() {
    this.pump();
    if (!this.slots.some((s) => s.job) && !this.items.some((x) => x.state === 'queued')) {
      void this.allDone();
      void this.keepAwake(false);
    }
  }

  private recordSpeed(key: SpeedKey, pxPerSec: number) {
    if (!Number.isFinite(pxPerSec) || pxPerSec <= 0) return;
    const cur = this.speeds[key] ?? { ...DEFAULT_SPEEDS[key] };
    this.speeds = { ...this.speeds, [key]: { pxPerSec: cur.samples === 0 ? pxPerSec : cur.pxPerSec * 0.6 + pxPerSec * 0.4, samples: cur.samples + 1 } };
  }

  // ---------- Screen and notifications ----------

  /** Phones stop web pages when the screen locks, so the screen is kept on while files are compressing. */
  private async keepAwake(on: boolean) {
    const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLock> } }).wakeLock;
    if (on) {
      if (!wl || (this.wake && !this.wake.released) || document.visibilityState !== 'visible') return;
      this.wake = await wl.request('screen').catch(() => null);
    } else {
      await this.wake?.release().catch(() => {});
      this.wake = null;
    }
  }

  private queueLeft() {
    return planQueue(this.items, this.settings, liveSpeeds(this.items, this.settings, this.speeds)).total;
  }

  private statusUpdate() {
    const now = Date.now();
    if (now - this.lastStatusAt < 20_000 || document.visibilityState === 'visible') return; // only while the page is in the background
    this.lastStatusAt = now;
    const running = this.items.filter((x) => this.slots.some((s) => s.job === x.id));
    if (!running.length) return;
    const parts = running.map((x) => (x.kind === 'video' ? `Video ${x.state === 'checking' ? 'quality check' : 'compressing'} ${Math.round(x.progress * 100)}%` : x.kind === 'doc' ? 'Document' : 'Photo'));
    void notify({
      title: `Compressing ${Math.min(this.batch.total, this.batch.done + 1)} of ${this.batch.total}`,
      body: `${parts.join(' · ')}\n${formatEta(this.queueLeft())} left for everything`,
      tag: 'status',
      silent: true,
      url: '/compress',
    });
  }

  private fileDone(kind: Kind, saved: number | null) {
    const { total, done } = this.batch;
    if (done >= total) return;
    this.lastStatusAt = Date.now();
    void notify({
      title: `${done} of ${total} done`,
      body: `${kind === 'video' ? 'Video' : kind === 'doc' ? 'Document' : 'Photo'} ${saved !== null ? `is in Media · ${formatSize(saved)} smaller` : 'kept as is'}. ${formatEta(this.queueLeft())} left.`,
      tag: 'status',
      silent: true,
      url: '/compress',
    });
  }

  private async allDone() {
    const { total, freed, failed } = this.batch;
    if (!total) return;
    this.batch = { total: 0, done: 0, freed: 0, failed: 0 };
    await notify({
      title: 'All done',
      body: `${total} ${total === 1 ? 'file is' : 'files are'} in Media${freed > 0 ? ` · ${formatSize(freed)} to free` : ''}${failed ? ` · ${failed} failed` : ''}. Tap to replace the originals.`,
      tag: 'status',
      renotify: true,
      url: freed > 0 ? '/review' : '/compress',
    });
  }

  // ---------- Decisions ----------

  async decide(id: string, action: 'accept' | 'keepOriginal') {
    const x = this.get(id);
    if (!x) return;
    if (action === 'accept' && x.state === 'ready') this.update(id, { state: 'freed', decidedAt: Date.now() });
    if (action === 'keepOriginal' && (x.state === 'ready' || x.state === 'freed') && !x.replaced) {
      await removeOutput(id, x.result?.outputExt);
      this.update(id, { state: 'keptOriginal', decidedAt: Date.now() });
    }
  }

  /** "Keep both": the compressed copy was saved as a new file, so the original stays and the copy is not deleted here. */
  markKeptBoth(id: string) {
    if (this.get(id)?.result) this.update(id, { keptBoth: Date.now() });
  }

  /**
   * Puts the compressed copy where the original is, in the folder the user opened, and deletes the original.
   * Same file type: the file is overwritten in place. Different type (photo → AVIF): a new file is written next to
   * it and the original is removed. Can't be undone.
   */
  /** Whether Compressly holds a link to this file's original on the device. */
  hasLink(id: string) {
    return this.links.has(id);
  }

  /** Links a ready file to its original, picked again by the user, so it can be replaced in place. */
  async attachOriginal(id: string, handle: FileSystemFileHandle) {
    const x = this.get(id);
    if (!x) return;
    const file = await handle.getFile();
    if (file.size !== x.originalBytes) throw new Error(`That's a different file. Pick the original "${x.name}" (${formatSize(x.originalBytes)}).`);
    const link = { file: handle };
    this.links.set(id, link);
    this.originals.set(id, file);
    await db.put('handles', id, link).catch(() => {});
    this.update(id, { inFolder: true, folderPath: x.folderPath ?? file.name });
  }

  /** Asks for permission to change the original. Call straight from a tap: browsers only ask then. */
  async allowWrite(id: string, ask: boolean): Promise<boolean> {
    const link = this.links.get(id);
    if (!link) return false;
    const h = (link.dir ?? link.file) as FileSystemHandle & PermissionHandle;
    let p = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (p !== 'granted' && ask) p = (await h.requestPermission?.({ mode: 'readwrite' }).catch(() => 'denied' as const)) ?? 'denied';
    return p === 'granted';
  }

  /** True when the compressed copy can be written over the original on the device. */
  canReplace(id: string): boolean {
    const x = this.get(id);
    const link = this.links.get(id);
    if (!x?.result || !link || x.replaced || !['ready', 'freed'].includes(x.state)) return false;
    const same = x.ext.replace('jpeg', 'jpg') === x.result.outputExt.replace('jpeg', 'jpg');
    return same || !!link.dir;
  }

  async replaceInFolder(id: string) {
    const x = this.get(id);
    const link = this.links.get(id);
    if (!x?.result || !link) throw new Error("This file was added in a way that can't be replaced. Download the compressed copy instead.");
    const same = (a: string, b: string) => a.replace('jpeg', 'jpg') === b.replace('jpeg', 'jpg');
    const sameType = same(x.ext, x.result.outputExt);
    // A single picked file can only be overwritten; it can't be renamed to a new type.
    if (!link.dir && !sameType) throw new Error(`The compressed photo is a different file type (.${x.result.outputExt}), so it can't replace this one. Download it instead, or choose "Optimised JPEG" in Settings.`);
    const h = (link.dir ?? link.file) as FileSystemHandle & PermissionHandle;
    let p = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (p !== 'granted') p = (await h.requestPermission?.({ mode: 'readwrite' })) ?? 'denied';
    if (p !== 'granted') throw new Error('Compressly needs your OK to change this file. Tap Replace again and choose Allow.');
    const out = await readOutput(id, x.result.outputExt);
    if (!out) throw new Error('The compressed copy is missing. Compress the file again.');

    let handle = link.file;
    let name = link.file.name;
    if (!sameType && link.dir) {
      name = `${name.replace(/\.[^.]+$/, '')}.${x.result.outputExt}`;
      handle = await link.dir.getFileHandle(name, { create: true });
    }
    try {
      const w = await (handle as FileSystemFileHandle & { createWritable(): Promise<FileSystemWritableFileStream> }).createWritable();
      await w.write(out);
      await w.close();
    } catch {
      throw new Error("This phone or browser didn't let Compressly change the file (files from cloud photos can't be changed). The original is untouched. Use Download instead.");
    }
    if (handle !== link.file && link.dir) await link.dir.removeEntry(link.file.name);

    const newLink = { file: handle, dir: link.dir };
    this.links.set(id, newLink);
    await db.put('handles', id, newLink).catch(() => {});
    // The file now on the device is the small one; keep it for this visit so it plays straight away.
    const fresh = await handle.getFile().catch(() => null);
    if (fresh) this.originals.set(id, fresh);
    else this.originals.delete(id);
    // The device now holds the small file in the original's place; keeping our copy too would use the space again.
    await removeOutput(id, x.result.outputExt).catch(() => {});
    this.update(id, { state: 'freed', replaced: true, decidedAt: Date.now(), folderPath: x.folderPath?.replace(/[^/]+$/, name) });
  }

  // ---------- Library ----------

  async remove(id: string) {
    this.cancel(id);
    const x = this.get(id);
    await removeOutput(id, x?.result?.outputExt);
    await Promise.all([db.del('thumbs', id), db.del('handles', id)]).catch(() => {});
    this.originals.delete(id);
    this.links.delete(id);
    this.items = this.items.filter((y) => y.id !== id);
    this.emit();
  }

  async clear() {
    for (const x of this.items) if (ACTIVE_STATES.includes(x.state)) this.cancel(x.id);
    this.items = [];
    this.originals.clear();
    this.links.clear();
    await Promise.all([clearOutputs(), db.clear('thumbs'), db.clear('handles')]).catch(() => {});
    this.emit();
  }

  /** One file's own format (Compress page), instead of the one in Settings. */
  setFormat(id: string, format: FormatChoice) {
    const x = this.get(id);
    if (!x || x.state !== 'new') return;
    const next = { ...x, format: { ...x.format, ...format } };
    this.update(id, { format: next.format, estimateBytes: estimateBytes(next, this.settings) });
  }

  setSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    // Size estimates for files not yet compressed follow the new settings.
    this.items = this.items.map((x) => (x.state === 'new' ? { ...x, estimateBytes: estimateBytes(x, this.settings) } : x));
    this.emit();
  }
}

interface PermissionHandle {
  queryPermission?(o: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

const g = globalThis as typeof globalThis & { __compresslyEngine?: Engine };
export const engine: Engine = (g.__compresslyEngine ??= new Engine());
export type { Availability };
