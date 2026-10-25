/**
 * Sizes the way the app shows them (GB with 1 decimal from 1 GB), plus finer steps below
 * 10 MB so single photos don't all read "0 MB" while testing.
 */
export function formatSize(bytes: number): string {
  const mb = bytes / 1e6;
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (bytes <= 0) return '0 MB';
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Splits a size into number and unit for the big stat cards. */
export function sizeParts(bytes: number): [string, string] {
  const [n, u] = formatSize(bytes).split(' ');
  return [n, u];
}

export function savingPct(before: number, after: number): number {
  return before > 0 ? Math.round((1 - after / before) * 100) : 0;
}

export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "a few seconds", "about 40 s", "about 3 min", "about 1 h 20 min". */
export function formatEta(sec: number): string {
  if (sec < 5) return 'a few seconds';
  if (sec < 60) return `about ${Math.round(sec / 5) * 5} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `about ${min} min`;
  const h = Math.floor(min / 60);
  return `about ${h} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

/** Short form for file rows: "~40 s", "~3 min", "~1 h 20 min". */
export function formatEtaShort(sec: number): string {
  return formatEta(sec).replace('about ', '~').replace('a few seconds', '~5 s');
}

/** "VID_2041-compressed.mp4": the name a saved compressed copy gets. */
export function compressedName(item: { name: string; ext: string; result?: { outputExt: string } }): string {
  return `${item.name.replace(/\.[^.]+$/, '')}-compressed.${item.result?.outputExt ?? item.ext}`;
}
