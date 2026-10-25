'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { Empty, FileRow, Segmented, stateWords } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { formatSize } from '@/lib/format';
import type { ItemState, Kind, MediaItem } from '@/lib/types';

type Tab = 'all' | Kind;

const CHIP: Partial<Record<ItemState, string>> = {
  ready: 'primary',
  freed: 'accent',
  notWorthIt: '',
  failed: 'warn',
  new: 'tertiary',
  keptOriginal: '',
};

/** Short chip words; the full wording is on the file's page. */
const SHORT: Partial<Record<ItemState, string>> = { notWorthIt: 'Kept as is', failed: 'Failed', new: 'Not yet', ready: 'Compressed' };

export default function MediaPage() {
  const { data } = useLibrary();
  const [tab, setTab] = useState<Tab>('all');
  const [error, setError] = useState('');
  const items = (data?.items ?? []).filter((x) => tab === 'all' || x.kind === tab);
  const count = (k: Kind) => data?.items.filter((x) => x.kind === k).length ?? 0;
  const total = items.reduce((n, x) => n + x.originalBytes, 0);

  const remove = (x: MediaItem) => {
    if (confirm(`Remove "${x.name}" from Compressly? The original on your device is not touched.`)) void engine.remove(x.id);
  };
  const replace = async (x: MediaItem) => {
    if (!confirm(`Replace "${x.name}" on your device with the smaller copy? This can't be undone.`)) return;
    setError('');
    try {
      await engine.replaceInFolder(x.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <ScreenHeader
        title="Media"
        subtitle={data ? `${items.length} files · ${formatSize(total)}` : undefined}
        actions={
          (data?.items.length ?? 0) > 1 && (
            <button
              className="btn ghost small"
              onClick={() => confirm('Remove every file from Compressly? Originals on your device are not touched.') && void engine.clear()}
            >
              <Icon name="trash" size={16} /> Remove all
            </button>
          )
        }
      />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: `All ${data?.items.length ?? ''}` },
          { value: 'video', label: `Videos ${count('video')}` },
          { value: 'photo', label: `Photos ${count('photo')}` },
        ]}
      />
      {error && <div className="banner warn">{error}</div>}
      <section className="card" style={{ padding: '4px 12px' }}>
        {items.length ? (
          <div className="list">
            {items.map((x) => (
              <FileRow
                key={x.id}
                item={x}
                extra={<span className={`chip small ${CHIP[x.state] ?? 'primary'}`} style={{ justifySelf: 'start', marginTop: 4 }}>{SHORT[x.state] ?? stateWords(x.state)}</span>}
                trailing={
                  <span className="row-actions">
                    {engine.canReplace(x.id) && (
                      <button className="btn primary small" aria-label={`Replace ${x.name}`} onClick={() => void replace(x)}>
                        Replace
                      </button>
                    )}
                    <button className="icon-btn" aria-label={`Remove ${x.name}`} title="Remove" onClick={() => remove(x)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <Empty icon="media" title="No files here yet">
            <Link href="/compress" className="btn primary small">
              Add photos and videos
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}
