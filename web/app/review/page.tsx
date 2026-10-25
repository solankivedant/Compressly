'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { Empty, FileRow, TrustBadge } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { formatSize } from '@/lib/format';

/** The app's "Review originals": accept the compressed copies, or keep an original per file. */
export default function ReviewPage() {
  const { data } = useLibrary();
  const [busy, setBusy] = useState(false);
  const ready = (data?.items ?? []).filter((x) => x.state === 'ready');
  const total = ready.reduce((n, x) => n + x.originalBytes - (x.result?.outputBytes ?? 0), 0);

  const decide = async (id: string, action: 'accept' | 'keepOriginal') => {
    await engine.decide(id, action);
  };

  const acceptAll = async () => {
    setBusy(true);
    try {
      for (const x of ready) await decide(x.id, 'accept');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenHeader title="Review" subtitle="Ready to free" back="/" />
      {ready.length === 0 ? (
        <section className="card">
          <Empty icon="checkCircle" title="Nothing waiting for review">
            <Link href="/compress" className="btn primary small">
              Go to Compress
            </Link>
          </Empty>
        </section>
      ) : (
        <>
          <p className="muted">Tap a file to compare, replace or download it.</p>
          <section className="card" style={{ padding: '4px 12px' }}>
            <div className="list">
              {ready.map((x) => (
                <FileRow
                  key={x.id}
                  item={x}
                  trailing={
                    <button className="btn ghost small" onClick={() => void decide(x.id, 'keepOriginal')}>
                      Keep original
                    </button>
                  }
                />
              ))}
            </div>
          </section>
          <div className="sticky-foot">
            <span>
              <strong>{ready.length} files</strong> <span className="muted">· {formatSize(total)}</span>
            </span>
            <button className="btn primary" disabled={busy} onClick={() => void acceptAll()}>
              <Icon name="check" size={18} /> Use compressed · free {formatSize(total)}
            </button>
          </div>
        </>
      )}
      <TrustBadge />
    </>
  );
}
