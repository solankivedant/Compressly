'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { engine } from '@/engine/engine';
import { formatBefore, formatSize } from '@/lib/format';
import type { MediaItem } from '@/lib/types';
import Icon from './Icon';
import { useFileUrl } from './useLibrary';

// One preview at a time for the whole site, opened from anywhere with openPreview().
let open: MediaItem | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a file's original full size, so it can be checked before compressing. */
export function openPreview(item: MediaItem) {
  open = item;
  emit();
}

function close() {
  open = null;
  emit();
}

/** Mounted once in the shell. */
export function PreviewHost() {
  const item = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => null,
  );
  if (!item) return null;
  return <PreviewView key={item.id} item={item} />;
}

function PreviewView({ item }: { item: MediaItem }) {
  // Asking is fine here: the preview opens from a tap, and folder files may need the OK again after a reload.
  const url = useFileUrl(() => engine.original(item.id, true), item.id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="dialog-backdrop" onClick={close}>
      <div className="preview" role="dialog" aria-modal="true" aria-label={`Preview of ${item.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span className="grow" style={{ minWidth: 0 }}>
            <strong className="row-title">{item.name}</strong>
            <span className="muted tabular" style={{ fontSize: 13 }}>
              {formatBefore(item)} · {formatSize(item.originalBytes)}
            </span>
          </span>
          <button className="icon-btn" aria-label="Close preview" onClick={close} autoFocus>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="preview-body">
          {url === undefined ? (
            <span className="muted">Opening…</span>
          ) : url === '' ? (
            <span className="muted">This file isn&apos;t open on this page any more. Pick it again to view it.</span>
          ) : item.kind === 'video' ? (
            <video src={url} controls autoPlay playsInline />
          ) : item.kind === 'photo' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={item.name} />
          ) : item.ext === 'pdf' ? (
            <iframe src={url} title={item.name} />
          ) : (
            <span className="muted">{item.ext.toUpperCase()} files can&apos;t be shown here. It will look the same after compressing.</span>
          )}
        </div>
      </div>
    </div>
  );
}
