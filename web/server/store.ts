import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_SPEEDS } from '@/lib/rules';
import { ACTIVE_STATES, type MediaItem, type Settings, type SpeedKey, type Speeds } from '@/lib/types';

/** Everything the site keeps lives under web/.data (git-ignored). COMPRESSLY_DATA_DIR moves it (used for test runs). */
export const DATA_DIR = process.env.COMPRESSLY_DATA_DIR || path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'library.json');

/**
 * Set when the site was deployed to a hosting service (Vercel, AWS Lambda) instead of run on a computer.
 * Those can't run FFmpeg, keep files, or work in the background, so the site explains that instead of failing.
 */
export const HOSTED = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

export class HostedError extends Error {
  constructor() {
    super('This copy of Compressly is running on a hosting service, which cannot store or compress files. Run it on your computer instead.');
  }
}

export const DEFAULT_SETTINGS: Settings = { preset: 'balanced', videoCodec: 'hevc', photoFormat: 'heic' };

interface Db {
  items: MediaItem[];
  settings: Settings;
  speeds: Speeds;
}

const freshSpeeds = (): Speeds => structuredClone(DEFAULT_SPEEDS);

type G = typeof globalThis & { __compresslyDb?: Db; __compresslySaveTimer?: NodeJS.Timeout };
const g = globalThis as G;

function load(): Db {
  if (HOSTED) throw new HostedError();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Db;
    // Before stage speeds existed, the video speeds covered encode + check together; start those over.
    if (db.speeds && !db.speeds['video-check']) {
      delete (db.speeds as Partial<Speeds>)['video-hevc'];
      delete (db.speeds as Partial<Speeds>)['video-h264'];
    }
    // Jobs that were running when the server stopped go back to "new".
    for (const x of db.items) {
      if (ACTIVE_STATES.includes(x.state)) {
        x.state = 'new';
        x.progress = 0;
        x.stageStartedAt = undefined;
        x.attempt = undefined;
      }
    }
    return { items: db.items ?? [], settings: { ...DEFAULT_SETTINGS, ...db.settings }, speeds: { ...freshSpeeds(), ...db.speeds } };
  } catch {
    return { items: [], settings: { ...DEFAULT_SETTINGS }, speeds: freshSpeeds() };
  }
}

function db(): Db {
  return (g.__compresslyDb ??= load());
}

function scheduleSave() {
  clearTimeout(g.__compresslySaveTimer);
  g.__compresslySaveTimer = setTimeout(async () => {
    const tmp = `${DB_FILE}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(db(), null, 1));
    await fsp.rename(tmp, DB_FILE);
  }, 250);
}

export function itemDir(id: string) {
  return path.join(DATA_DIR, 'files', id);
}

export function originalPath(item: MediaItem) {
  return path.join(itemDir(item.id), `original.${item.ext}`);
}

export function outputPath(item: MediaItem, ext = item.result?.outputExt ?? 'bin') {
  return path.join(itemDir(item.id), `output.${ext}`);
}

export function thumbPath(item: MediaItem) {
  return path.join(itemDir(item.id), 'thumb.jpg');
}

export const store = {
  list(): MediaItem[] {
    return [...db().items].sort((a, b) => b.addedAt - a.addedAt);
  },
  get(id: string): MediaItem | undefined {
    return db().items.find((x) => x.id === id);
  },
  add(item: MediaItem) {
    db().items.push(item);
    scheduleSave();
  },
  update(id: string, patch: Partial<MediaItem>): MediaItem | undefined {
    const item = this.get(id);
    if (!item) return undefined;
    Object.assign(item, patch);
    scheduleSave();
    return item;
  },
  async remove(id: string) {
    const d = db();
    d.items = d.items.filter((x) => x.id !== id);
    scheduleSave();
    await fsp.rm(itemDir(id), { recursive: true, force: true });
  },
  async clear() {
    const d = db();
    d.items = [];
    scheduleSave();
    await fsp.rm(path.join(DATA_DIR, 'files'), { recursive: true, force: true });
  },
  settings(): Settings {
    return db().settings;
  },
  setSettings(patch: Partial<Settings>): Settings {
    Object.assign(db().settings, patch);
    scheduleSave();
    return db().settings;
  },
  speeds(): Speeds {
    return db().speeds;
  },
  /** Folds one finished job's speed into the running average (first real job replaces the starting guess). */
  recordSpeed(key: SpeedKey, pxPerSec: number) {
    if (!Number.isFinite(pxPerSec) || pxPerSec <= 0) return;
    const cur = db().speeds[key] ?? { ...DEFAULT_SPEEDS[key] }; // a library loaded before this speed existed
    db().speeds[key] = {
      pxPerSec: cur.samples === 0 ? pxPerSec : cur.pxPerSec * 0.6 + pxPerSec * 0.4,
      samples: cur.samples + 1,
    };
    scheduleSave();
  },
};
