'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { FileRow, ProgressBar, Segmented, Thumb, clockTime, stateWords, useNow } from '@/components/ui';
import { api, useLibrary } from '@/components/useLibrary';
import { formatEta, formatEtaShort, formatSize } from '@/lib/format';
import { DEFAULT_SPEEDS, PHOTO_FORMATS, PRESETS, queueRemainingSeconds, remainingSeconds, speedKey } from '@/lib/rules';
import { ACTIVE_STATES, type MediaItem, type Preset, type Settings } from '@/lib/types';

const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|avi|3gp)$/i;
const PHOTO_EXT = /\.(jpe?g|png|webp|avif|heic|heif|tiff?|gif|bmp)$/i;

function mimeOf(f: File) {
  if (f.type.startsWith('video/') || f.type.startsWith('image/')) return f.type;
  if (VIDEO_EXT.test(f.name)) return 'video/mp4';
  if (PHOTO_EXT.test(f.name)) return 'image/jpeg';
  return '';
}

interface Upload {
  key: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

function uploadOne(file: File, onProgress: (p: number) => void): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/items');
    xhr.setRequestHeader('Content-Type', mimeOf(file));
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 400) reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
      else resolve(body as MediaItem);
    };
    xhr.onerror = () => reject(new Error('Upload failed. Is the local server running?'));
    xhr.send(file);
  });
}

export default function CompressPage() {
  const { data, refresh } = useLibrary();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [picked, setPicked] = useState<Set<string> | null>(null); // null = everything selected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const items = data?.items ?? [];
  const settings = data?.settings;
  const active = items.filter((x) => ACTIVE_STATES.includes(x.state)).sort((a, b) => a.addedAt - b.addedAt);
  const todo = items.filter((x) => x.state === 'new' || x.state === 'failed');
  const ready = items.filter((x) => x.state === 'ready');
  const chosen = useMemo(() => todo.filter((x) => (picked ? picked.has(x.id) : true)), [todo, picked]);
  const chosenSaving = chosen.reduce((n, x) => n + Math.max(0, x.originalBytes - x.estimateBytes), 0);

  // Time estimates: per file, the running queue, and the files ticked below it.
  const now = useNow(active.length > 0);
  const speeds = data?.speeds ?? DEFAULT_SPEEDS;
  const eta = (x: MediaItem) => (settings ? remainingSeconds(x, settings, speeds, now) : 0);
  const queueLeft = settings ? queueRemainingSeconds(items, settings, speeds, now) : 0;
  const chosenTime = chosen.reduce((n, x) => n + eta(x), 0);
  // True while some encoder hasn't finished a file on this computer yet, so its time is still the built-in guess.
  const firstGuess = !!settings && [...active, ...chosen].some((x) => !speeds[speedKey(x.kind, x.queuedWith ?? settings)]?.samples);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError('');
    const files = Array.from(list).filter((f) => mimeOf(f));
    if (files.length < list.length) setError('Some files were skipped: only photos and videos can be added.');
    const batch = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, size: f.size, progress: 0 }));
    setUploads((u) => [...u, ...batch]);
    // One at a time, so a big video doesn't starve the rest.
    for (let i = 0; i < files.length; i++) {
      const key = batch[i].key;
      try {
        await uploadOne(files[i], (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))));
        setUploads((u) => u.filter((x) => x.key !== key));
        await refresh();
      } catch (e) {
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
      }
    }
  };

  const setSetting = async (patch: Partial<Settings>) => {
    await api('/api/settings', { method: 'PUT', json: patch });
    await refresh();
  };

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/queue', { method: 'POST', json: { ids: chosen.map((x) => x.id) } });
      setPicked(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    const s = new Set(picked ?? todo.map((x) => x.id));
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setPicked(s);
  };

  return (
    <>
      <ScreenHeader title="Compress" subtitle={settings ? `${PRESETS[settings.preset].label} preset` : undefined} />

      <label
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => void addFiles(e.target.files).then(() => (e.target.value = ''))} />
        <span className="drop-icon">
          <Icon name="upload" size={24} />
        </span>
        <strong>Drop photos and videos here</strong>
        <span className="muted">or click to choose. Copy them from your phone first for a real test.</span>
      </label>

      {error && <div className="banner warn">{error}</div>}

      {uploads.length > 0 && (
        <section className="card">
          <h2 className="section-label" style={{ paddingBottom: 4 }}>
            Adding
          </h2>
          {uploads.map((u) => (
            <div key={u.key} className="queue-row">
              <div className="row-between">
                <span className="row-title">{u.name}</span>
                <span className="muted tabular">{u.error ? '' : `${Math.round(u.progress * 100)}%`}</span>
              </div>
              {u.error ? (
                <div className="row-between">
                  <span className="chip warn">{u.error}</span>
                  <button className="btn ghost small" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                    Dismiss
                  </button>
                </div>
              ) : (
                <ProgressBar value={u.progress < 1 ? u.progress : 1} />
              )}
              {!u.error && u.progress >= 1 && <span className="muted" style={{ fontSize: 13 }}>Reading the file and making a thumbnail…</span>}
            </div>
          ))}
        </section>
      )}

      {settings && (
        <section className="card stack">
          <div className="row-between">
            <strong>How much to compress</strong>
            <Link href="/settings" className="chip">
              <Icon name="settings" size={14} /> More settings
            </Link>
          </div>
          <Segmented<Preset>
            value={settings.preset}
            onChange={(preset) => void setSetting({ preset })}
            options={(Object.keys(PRESETS) as Preset[]).map((p) => ({ value: p, label: PRESETS[p].label }))}
          />
          <span className="muted" style={{ fontSize: 14 }}>
            {PRESETS[settings.preset].blurb}. Photos: {PHOTO_FORMATS[settings.photoFormat].label}. Video:{' '}
            {settings.videoCodec === 'hevc' ? 'HEVC' : 'H.264'}.
            {PRESETS[settings.preset].pro && ' (Pro in the app. Open here for testing.)'}
          </span>
        </section>
      )}

      {active.length > 0 && (
        <section className="card">
          <div className="row-between" style={{ paddingBottom: 8 }}>
            <h2 className="section-label">Queue</h2>
            <span className="chip primary">{active.length} left</span>
          </div>
          <div className="eta-total" aria-live="polite">
            <span className="small">Time left for the whole queue</span>
            <span className="big">{formatEta(queueLeft)}</span>
            <span className="small">
              Done around {clockTime(now + queueLeft * 1000)}
              {firstGuess && ' · first guess, gets more accurate after each file'}
            </span>
          </div>
          {active.map((x) => (
            <div key={x.id} className="queue-row">
              <div className="file-row" style={{ padding: 0 }}>
                <Thumb item={x} size={40} />
                <span className="row-main">
                  <span className="row-title">{x.name}</span>
                  <span className="row-sub">
                    {stateWords(x.state)}
                    {x.state !== 'queued' && ` · ${Math.round(x.progress * 100)}%`}
                  </span>
                </span>
                <span className="eta" title="Estimated time for this file">
                  <Icon name="clock" size={14} />
                  {x.state === 'queued' ? formatEtaShort(eta(x)) : `${formatEtaShort(eta(x))} left`}
                </span>
                <button className="icon-btn" aria-label={`Cancel ${x.name}`} onClick={() => void api(`/api/queue?id=${x.id}`, { method: 'DELETE' }).then(refresh)}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              {x.state !== 'queued' && <ProgressBar value={x.progress} />}
            </div>
          ))}
        </section>
      )}

      {ready.length > 0 && (
        <Link href="/review" className="banner info row-between">
          <span>
            <strong>{ready.length} ready to free</strong> · {formatSize(ready.reduce((n, x) => n + x.originalBytes - (x.result?.outputBytes ?? 0), 0))}
          </span>
          <span className="row-between" style={{ gap: 4 }}>
            Review <Icon name="chevron" size={16} />
          </span>
        </Link>
      )}

      {todo.length > 0 && (
        <>
          <div className="row-between">
            <h2 className="section-label">To compress</h2>
            <button className="btn ghost small" onClick={() => setPicked(picked && picked.size === 0 ? null : new Set())}>
              {picked && picked.size === 0 ? 'Select all' : 'Select none'}
            </button>
          </div>
          <section className="card" style={{ padding: '4px 12px' }}>
            <div className="list">
              {todo.map((x) => (
                <FileRow
                  key={x.id}
                  item={x}
                  trailing={
                    <>
                      <span className="eta" title="Estimated time to compress">
                        <Icon name="clock" size={14} />
                        {formatEtaShort(eta(x))}
                      </span>
                      <input
                        type="checkbox"
                        className="check"
                        checked={picked ? picked.has(x.id) : true}
                        onChange={() => toggle(x.id)}
                        aria-label={`Include ${x.name}`}
                      />
                    </>
                  }
                />
              ))}
            </div>
            {todo.some((x) => x.state === 'failed') && (
              <p className="muted" style={{ fontSize: 13, padding: '0 4px 8px' }}>
                Files that went wrong can be tried again. Open one to see the error.
              </p>
            )}
          </section>
          <div className="sticky-foot">
            <span style={{ display: 'grid' }}>
              <span>
                <strong>{chosen.length} files</strong> <span className="muted">· save about {formatSize(chosenSaving)}</span>
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                <Icon name="clock" size={13} /> Takes {formatEta(chosenTime)}
                {active.length > 0 ? `, after the current queue (${formatEta(queueLeft)})` : ''} · done around{' '}
                {clockTime(now + (chosenTime + queueLeft) * 1000)}
              </span>
            </span>
            <button className="btn primary" disabled={busy || chosen.length === 0} onClick={start}>
              <Icon name="compress" size={18} /> Compress {chosen.length} {chosen.length === 1 ? 'file' : 'files'}
            </button>
          </div>
        </>
      )}

      {todo.length === 0 && active.length === 0 && uploads.length === 0 && items.length > 0 && (
        <p className="trust">Everything you added has been compressed. Add more above.</p>
      )}
    </>
  );
}
