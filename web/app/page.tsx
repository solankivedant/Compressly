'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { Empty, FileRow, ProgressBar, StatCard, TrustBadge, useNow } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { formatEta, formatSize } from '@/lib/format';
import { liveSpeeds, planQueue } from '@/lib/rules';
import type { Summary } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Counts up to the new value in ≤ 1.2 s (DESIGN §8.4). */
function useCountUp(target: number) {
  const [v, setV] = useState(target);
  useEffect(() => {
    const from = v;
    if (from === target) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setV(target);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1200);
      setV(from + (target - from) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}

function LibraryRing({ s }: { s: Summary }) {
  const total = Math.max(1, s.libraryBytes);
  const r = 52;
  const C = 2 * Math.PI * r;
  const segs = [
    { v: s.freedBytes, color: 'var(--accent)', label: 'Freed' },
    { v: s.pendingBytes, color: 'var(--primary)', label: 'Ready to free' },
    { v: s.stillToFreeBytes, color: 'var(--tertiary)', label: 'Still to free' },
  ];
  let offset = 0;
  const savedAll = s.freedBytes + s.pendingBytes + s.stillToFreeBytes;
  return (
    <section className="card ring-card">
      <svg className="ring" width={132} height={132} viewBox="0 0 132 132" role="img" aria-label={`${formatSize(savedAll)} of ${formatSize(s.libraryBytes)} can be saved`}>
        <circle cx={66} cy={66} r={r} fill="none" stroke="var(--primary-container)" strokeWidth={14} />
        {segs.map((g) => {
          const len = (g.v / total) * C;
          const el = (
            <circle
              key={g.label}
              cx={66}
              cy={66}
              r={r}
              fill="none"
              stroke={g.color}
              strokeWidth={14}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 66 66)"
              style={{ transition: 'stroke-dasharray 0.8s var(--ease)' }}
            />
          );
          offset += len;
          return el;
        })}
        <text x={66} y={64} textAnchor="middle" fontSize={22} fontWeight={800} fill="var(--text)" className="num">
          {Math.round((savedAll / total) * 100)}%
        </text>
        <text x={66} y={84} textAnchor="middle" fontSize={11} fill="var(--muted)">
          can be saved
        </text>
      </svg>
      <div className="legend">
        {segs.map((g) => (
          <div key={g.label} className="legend-row">
            <span className="sw" style={{ background: g.color }} />
            <span className="muted">{g.label}</span>
            <b>{formatSize(g.v)}</b>
          </div>
        ))}
        <div className="legend-row">
          <span className="sw" style={{ background: 'var(--primary-container)' }} />
          <span className="muted">Your files in total</span>
          <b>{formatSize(s.libraryBytes)}</b>
        </div>
      </div>
    </section>
  );
}

function Welcome() {
  return (
    <section className="card stack" style={{ padding: 24 }}>
      <h2 className="hero-title">Free up space without losing a pixel.</h2>
      <p className="muted">
        Add photos and videos from your phone. Compressly re-encodes them at the same resolution, checks every result, and shows you the
        before and after so you can judge it yourself.
      </p>
      <div className="pillars">
        {[
          { icon: 'sparkle' as const, t: 'Same resolution', d: 'Width, height, frame rate and length never change.' },
          { icon: 'shield' as const, t: 'Stays on this device', d: 'Compressing happens right here in your browser. Nothing is uploaded.' },
          { icon: 'checkCircle' as const, t: 'You approve every change', d: 'Nothing replaces an original until you say so.' },
        ].map((p) => (
          <div key={p.t} className="pillar">
            <span className="pi">
              <Icon name={p.icon} />
            </span>
            <strong>{p.t}</strong>
            <span className="muted" style={{ fontSize: 14 }}>
              {p.d}
            </span>
          </div>
        ))}
      </div>
      <div>
        <Link href="/compress" className="btn primary">
          <Icon name="upload" size={18} /> Add photos and videos
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const { data } = useLibrary();
  const s = data?.summary;
  const freed = useCountUp(s?.freedBytes ?? 0);
  const now = useNow((s?.activeCount ?? 0) > 0);

  if (!data || !s) {
    return <ScreenHeader title="Compressly" subtitle={greeting()} />;
  }

  const possible = s.freedBytes + s.pendingBytes + s.stillToFreeBytes;
  const pct = possible > 0 ? Math.round((s.freedBytes / possible) * 100) : 0;
  const recent = data.items.filter((x) => x.result && ['ready', 'freed', 'notWorthIt', 'keptOriginal'].includes(x.state)).slice(0, 4);

  return (
    <>
      <ScreenHeader
        title="Compressly"
        subtitle={greeting()}
        actions={
          <Link href="/history" className="icon-btn" aria-label="History">
            <Icon name="history" />
          </Link>
        }
      />

      {data.items.length === 0 ? (
        <Welcome />
      ) : (
        <>
          <StatCard tone="accent" large icon="checkCircle" label="Freed till now" bytes={freed} sub={`${s.compressedCount} files compressed · same resolution`}>
            <ProgressBar value={pct / 100} tone="accent" />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}% of what can be freed</span>
          </StatCard>

          <div className="two">
            <StatCard
              tone="primary"
              icon="clock"
              label="Ready to free"
              bytes={s.pendingBytes}
              sub={s.pendingBytes > 0 ? 'Tap to review' : 'Nothing waiting'}
              href={s.pendingBytes > 0 ? '/review' : undefined}
            />
            <StatCard
              tone="tertiary"
              icon="hourglass"
              label="Still to free"
              bytes={s.stillToFreeBytes}
              sub={
                s.activeCount > 0
                  ? `${s.activeCount} in the queue · ${formatEta(planQueue(data.items, data.settings, liveSpeeds(data.items, data.settings, data.speeds, now), now).total)} left`
                  : s.stillToFreeBytes > 0
                    ? 'Estimate · tap to compress'
                    : 'All done'
              }
              href="/compress"
            />
          </div>

          <LibraryRing s={s} />

          <div className="row-between">
            <h2 className="section-label">Recent</h2>
            <Link href="/history" className="chip">
              <Icon name="history" size={14} /> History
            </Link>
          </div>
          <section className="card" style={{ padding: '4px 12px' }}>
            {recent.length ? (
              <div className="list">
                {recent.map((x) => (
                  <FileRow key={x.id} item={x} />
                ))}
              </div>
            ) : (
              <Empty icon="compress" title="Nothing compressed yet">
                <Link href="/compress" className="btn primary small">
                  Go to Compress
                </Link>
              </Empty>
            )}
          </section>
        </>
      )}
      <TrustBadge />
    </>
  );
}
