'use client';

import Link from 'next/link';
import { useState } from 'react';
import { askConfirm } from '@/components/Dialog';
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
  const [error, setError] = useState('');
  const ready = (data?.items ?? []).filter((x) => x.state === 'ready');
  const total = ready.reduce((n, x) => n + x.originalBytes - (x.result?.outputBytes ?? 0), 0);

  const decide = async (id: string, action: 'accept' | 'keepOriginal') => {
    await engine.decide(id, action);
  };

  // Replacing writes each small copy over its original on the device, so nothing is stored twice.
  const replaceable = ready.filter((x) => engine.canReplace(x.id));
  const replaceAll = async () => {
    const before = replaceable.reduce((n, x) => n + x.originalBytes, 0);
    const after = replaceable.reduce((n, x) => n + (x.result?.outputBytes ?? 0), 0);
    const ok = await askConfirm({
      title: `Replace ${replaceable.length} originals?`,
      sizes: { before: formatSize(before), after: formatSize(after), saved: formatSize(before - after) },
      body: "The files on your device become the smaller copies. This can't be undone.",
      ok: 'Replace all',
    });
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      for (const x of replaceable) await engine.replaceInFolder(x.id);
    } catch (e) {
      setError((e as Error).message);
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
          <p className="muted">Tap a file to compare and zoom in before replacing.</p>
          {error && <div className="banner warn">{error}</div>}
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
            <button className="btn primary" disabled={busy || replaceable.length === 0} onClick={() => void replaceAll()}>
              <Icon name="check" size={18} /> Replace {replaceable.length === ready.length ? 'all' : replaceable.length} · free {formatSize(replaceable.reduce((n, x) => n + x.originalBytes - (x.result?.outputBytes ?? 0), 0))}
            </button>
          </div>
        </>
      )}
      <TrustBadge />
    </>
  );
}
