'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  /** Before → after sizes shown as a small summary, e.g. for Replace. */
  sizes?: { before: string; after: string; saved: string };
  ok: string;
  icon?: IconName;
  danger?: boolean;
}

type Open = ConfirmOptions & { resolve: (ok: boolean) => void };

// One dialog at a time for the whole site, opened from anywhere with askConfirm().
let open: Open | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** A styled replacement for window.confirm(). Resolves true for OK, false for Cancel. */
export function askConfirm(o: ConfirmOptions): Promise<boolean> {
  open?.resolve(false);
  return new Promise((resolve) => {
    open = { ...o, resolve };
    emit();
  });
}

function close(ok: boolean) {
  const o = open;
  open = null;
  emit();
  o?.resolve(ok);
}

/** Mounted once in the shell. */
export function DialogHost() {
  const o = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => null,
  );
  if (!o) return null;
  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(e) => e.stopPropagation()}>
        <span className={`dialog-icon ${o.danger ? 'danger' : ''}`}>
          <Icon name={o.icon ?? (o.danger ? 'trash' : 'compress')} size={22} />
        </span>
        <h2 id="dialog-title">{o.title}</h2>
        {o.sizes && (
          <div className="dialog-sizes">
            <span>
              <small>Now</small>
              <b>{o.sizes.before}</b>
            </span>
            <span className="arrow" aria-hidden="true">→</span>
            <span>
              <small>After</small>
              <b>{o.sizes.after}</b>
            </span>
            <span className="saved-tag">
              <Icon name="check" size={14} /> {o.sizes.saved} freed
            </span>
          </div>
        )}
        {o.body && <p className="muted">{o.body}</p>}
        <div className="dialog-actions">
          <button className="btn" onClick={() => close(false)}>
            Cancel
          </button>
          <button className={`btn ${o.danger ? 'danger' : 'primary'}`} onClick={() => close(true)} autoFocus>
            {o.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
