'use client';

import Link from 'next/link';
import { ScreenHeader } from '@/components/Shell';
import { Empty, Thumb } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { formatDate, formatSize, savingPct } from '@/lib/format';
import { qualityWords } from '@/lib/rules';
import type { MediaItem } from '@/lib/types';

function outcome(x: MediaItem): { text: string; chip: string } {
  switch (x.state) {
    case 'freed':
      return { text: 'Saved', chip: 'accent' };
    case 'ready':
      return { text: 'Ready to free', chip: 'primary' };
    case 'keptOriginal':
      return { text: 'Original kept', chip: '' };
    case 'notWorthIt':
      return { text: 'Not worth it', chip: '' };
    default:
      return { text: 'Failed', chip: 'warn' };
  }
}

/** Every job: date, file, before → after, quality, outcome (and why, if skipped). */
export default function HistoryPage() {
  const { data } = useLibrary();
  const done = (data?.items ?? [])
    .filter((x) => ['ready', 'freed', 'keptOriginal', 'notWorthIt', 'failed'].includes(x.state))
    .sort((a, b) => (b.result?.finishedAt ?? b.addedAt) - (a.result?.finishedAt ?? a.addedAt));

  return (
    <>
      <ScreenHeader title="History" subtitle={`${done.length} jobs`} back="/" />
      <section className="card" style={{ padding: '4px 12px' }}>
        {done.length === 0 ? (
          <Empty icon="history" title="No jobs yet" />
        ) : (
          <div className="list">
            {done.map((x) => {
              const o = outcome(x);
              const r = x.result;
              return (
                <div key={x.id} className="file-row">
                  <Link href={`/media/${x.id}`} className="row-link">
                    <Thumb item={x} />
                    <span className="row-main">
                      <span className="row-title">{x.name}</span>
                      <span className="row-sub">
                        {formatDate(r?.finishedAt ?? x.addedAt)} · {formatSize(x.originalBytes)}
                        {r && <> → {formatSize(r.outputBytes)} ({r.outputBytes < x.originalBytes ? `−${savingPct(x.originalBytes, r.outputBytes)}%` : 'not smaller'}) · {qualityWords(r.ssim)}</>}
                      </span>
                      {(x.state === 'notWorthIt' || x.state === 'failed') && x.reason && <span className="row-sub">{x.reason}</span>}
                    </span>
                  </Link>
                  <span className={`chip small ${o.chip}`}>{o.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
