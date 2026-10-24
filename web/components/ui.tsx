'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatDuration, formatSize, savingPct, sizeParts } from '@/lib/format';
import { qualityWords } from '@/lib/rules';
import type { ItemState, MediaItem } from '@/lib/types';
import Icon, { type IconName } from './Icon';

export type Tone = 'accent' | 'primary' | 'tertiary' | 'neutral';

/** Current time, re-read every second while `live` is true, so countdowns tick between server polls. */
export function useNow(live: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  return now;
}

export function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function StatCard(props: {
  tone: Tone;
  icon: IconName;
  label: string;
  bytes: number;
  sub?: ReactNode;
  large?: boolean;
  href?: string;
  children?: ReactNode;
}) {
  const [n, unit] = sizeParts(props.bytes);
  const body = (
    <>
      <div className="stat-label">
        <Icon name={props.icon} size={16} /> {props.label}
      </div>
      <div className="stat-value">
        <span className="num">{n}</span>
        <span className="unit">{unit}</span>
      </div>
      {props.sub && <div className="stat-sub">{props.sub}</div>}
      {props.children}
    </>
  );
  const cls = `stat stat-${props.tone} ${props.large ? 'stat-large' : ''}`;
  return props.href ? (
    <Link href={props.href} className={`${cls} tappable`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  return (
    <div className={`progress progress-${tone}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Thumb({ item, size = 48 }: { item: MediaItem; size?: number }) {
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/items/${item.id}/thumb`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      <span className="thumb-kind">
        <Icon name={item.kind === 'video' ? 'video' : 'photo'} size={12} />
        {item.kind === 'video' && item.durationSec ? formatDuration(item.durationSec) : null}
      </span>
    </span>
  );
}

const STATE_WORDS: Record<ItemState, string> = {
  new: 'Not compressed yet',
  queued: 'Waiting',
  compressing: 'Compressing',
  checking: 'Checking quality',
  saving: 'Saving',
  ready: 'Ready to free',
  notWorthIt: 'Not worth compressing, kept as is',
  failed: 'Something went wrong',
  freed: 'Freed',
  keptOriginal: 'Original kept',
};

export function stateWords(s: ItemState) {
  return STATE_WORDS[s];
}

/** "1.8 GB → 0.7 GB · −61% · Looks identical" — the app's file row. */
export function FileRow({
  item,
  trailing,
  extra,
  href = `/media/${item.id}`,
}: {
  item: MediaItem;
  trailing?: ReactNode;
  /** A third line under the sizes, e.g. the time estimate. */
  extra?: ReactNode;
  href?: string | null;
}) {
  const r = item.result;
  const after = r && item.state !== 'notWorthIt' && item.state !== 'failed' ? r.outputBytes : item.estimateBytes;
  const estimated = !r || item.state === 'new' || item.state === 'queued';
  const pct = savingPct(item.originalBytes, after);
  const main = (
    <>
      <Thumb item={item} />
      <span className="row-main">
        <span className="row-title">{item.name}</span>
        <span className="row-sub">
          {item.state === 'notWorthIt' || item.state === 'failed' ? (
            <>{formatSize(item.originalBytes)} · {stateWords(item.state)}</>
          ) : (
            <>
              {formatSize(item.originalBytes)} → {estimated ? '~' : ''}
              {formatSize(after)}
              {r && !estimated ? <> · {qualityWords(r.ssim)}</> : null}
            </>
          )}
        </span>
        {extra}
      </span>
      {item.state !== 'notWorthIt' && item.state !== 'failed' && pct > 0 && (
        <span className={`saving ${item.state === 'freed' ? 'saving-freed' : ''}`}>−{pct}%</span>
      )}
    </>
  );
  return (
    <div className="file-row">
      {href ? (
        <Link href={href} className="row-link">
          {main}
        </Link>
      ) : (
        <div className="row-link">{main}</div>
      )}
      {trailing}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function TrustBadge() {
  return (
    <p className="trust">
      <Icon name="shield" size={16} /> Processed on this computer · same resolution
    </p>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
