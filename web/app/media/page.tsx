'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScreenHeader } from '@/components/Shell';
import { Empty, FileRow, Segmented, stateWords } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { formatSize } from '@/lib/format';
import type { ItemState, Kind } from '@/lib/types';

type Tab = 'all' | Kind;

const CHIP: Partial<Record<ItemState, string>> = {
  ready: 'primary',
  freed: 'accent',
  notWorthIt: '',
  failed: 'warn',
  new: 'tertiary',
  keptOriginal: '',
};

export default function MediaPage() {
  const { data } = useLibrary();
  const [tab, setTab] = useState<Tab>('all');
  const items = (data?.items ?? []).filter((x) => tab === 'all' || x.kind === tab);
  const count = (k: Kind) => data?.items.filter((x) => x.kind === k).length ?? 0;
  const total = items.reduce((n, x) => n + x.originalBytes, 0);

  return (
    <>
      <ScreenHeader title="Media" subtitle={data ? `${items.length} files · ${formatSize(total)}` : undefined} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: `All ${data?.items.length ?? ''}` },
          { value: 'video', label: `Videos ${count('video')}` },
          { value: 'photo', label: `Photos ${count('photo')}` },
        ]}
      />
      <section className="card" style={{ padding: '4px 12px' }}>
        {items.length ? (
          <div className="list">
            {items.map((x) => (
              <FileRow key={x.id} item={x} trailing={<span className={`chip small ${CHIP[x.state] ?? 'primary'}`}>{stateWords(x.state)}</span>} />
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
