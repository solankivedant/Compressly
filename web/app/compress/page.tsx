'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDevice } from '@/components/device';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { FileRow, ProgressBar, Segmented, Thumb, clockTime, stateWords, useNow } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { engine, mediaKind } from '@/engine/engine';
import { canOpenFolder, canPickFiles, droppedFiles, pickFiles, pickFolder } from '@/engine/folder';
import { formatEta, formatEtaShort, formatSize } from '@/lib/format';
import { DEFAULT_SPEEDS, PRESETS, estimateSeconds, jobFraction, liveSpeeds, planQueue, speedKey } from '@/lib/rules';
import { ACTIVE_STATES, type MediaItem, type Preset, type Settings } from '@/lib/types';

interface Adding {
  total: number;
  done: number;
}

export default function CompressPage() {
  const { data } = useLibrary();
  const [adding, setAdding] = useState<Adding | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [folderOk, setFolderOk] = useState(false);
  const [linkOk, setLinkOk] = useState(false);
  const [over, setOver] = useState(false);
  const [picked, setPicked] = useState<Set<string> | null>(null); // null = everything selected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dev = useDevice();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setFolderOk(canOpenFolder());
    setLinkOk(canPickFiles());
  }, []);

  const items = data?.items ?? [];
  const settings = data?.settings;
  const active = items.filter((x) => ACTIVE_STATES.includes(x.state)).sort((a, b) => a.addedAt - b.addedAt);
  const todo = items.filter((x) => x.state === 'new' || x.state === 'failed');
  // After a reload, files picked from the gallery have to be picked again (the browser doesn't keep them).
  const gone = (x: MediaItem) => engine.availability(x.id) === 'gone';
  const ready = items.filter((x) => x.state === 'ready');
  const chosen = useMemo(() => todo.filter((x) => !gone(x) && (picked ? picked.has(x.id) : true)), [todo, picked]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosenSaving = chosen.reduce((n, x) => n + Math.max(0, x.originalBytes - x.estimateBytes), 0);

  // Time estimates. Running videos lend their live speed to every estimate, so times correct themselves within seconds.
  const now = useNow(active.length > 0);
  const speeds = settings ? liveSpeeds(items, settings, data?.speeds ?? DEFAULT_SPEEDS, now) : DEFAULT_SPEEDS;
  const plan = settings ? planQueue(items, settings, speeds, now) : { total: 0, byId: {} };
  const withChosen = settings && chosen.length ? planQueue(items, settings, speeds, now, chosen) : plan;
  const est = (x: MediaItem) => (settings ? estimateSeconds(x, settings, speeds) : 0);
  // True while some stage hasn't finished on this device yet, so its time is still the built-in guess.
  const firstGuess =
    !!settings &&
    [...active, ...chosen].some(
      (x) => !speeds[speedKey(x.kind, x.queuedWith ?? settings)]?.samples || (x.kind === 'video' && !speeds['video-check']?.samples),
    );

  const addFiles = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError('');
    const media = files.filter((f) => mediaKind(f));
    if (media.length < files.length) setError('Some files were skipped: only photos and videos can be added.');
    setAdding({ total: media.length, done: 0 });
    const p = await engine.add(media.map((file) => ({ file })), { fromPhone: dev.phone, onEach: (done) => setAdding({ total: media.length, done }) });
    setProblems(p);
    setAdding(null);
  };

  // Files picked or dropped with a link back to them, so the compressed copy can replace the original later.
  const addLinked = async (found: Awaited<ReturnType<typeof pickFiles>>) => {
    if (!found) return;
    if (!found.length) return setError('Only photos and videos can be added.');
    setError('');
    setAdding({ total: found.length, done: 0 });
    const p = await engine.add(found, { fromPhone: dev.phone, onEach: (done) => setAdding({ total: found.length, done }) });
    setProblems(p);
    setAdding(null);
  };

  const openFolder = async () => {
    setError('');
    const found = await pickFolder();
    if (!found) return;
    if (!found.length) return setError('No photos or videos were found in that folder.');
    setAdding({ total: found.length, done: 0 });
    const p = await engine.add(found, { fromPhone: dev.phone, onEach: (done) => setAdding({ total: found.length, done }) });
    setProblems(p);
    setAdding(null);
  };

  const setSetting = (patch: Partial<Settings>) => engine.setSettings(patch);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await engine.enqueue(chosen.map((x) => x.id));
      if (r.missing.length) setError(`${r.missing.length} file(s) need to be added again before they can be compressed.`);
      setPicked(null);
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
          const plain = Array.from(e.dataTransfer.files);
          void droppedFiles(e.dataTransfer)
            .catch(() => null)
            .then((found) => (found ? addLinked(found) : addFiles(plain)));
        }}
        onClick={(e) => {
          // Without links (iPhone, older browsers), the hidden input opens instead.
          if (!linkOk || e.target === input.current) return;
          e.preventDefault();
          void pickFiles().then(addLinked);
        }}
      >
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => void addFiles(e.target.files).then(() => (e.target.value = ''))} />
        <span className="drop-icon">
          <Icon name={dev.phone ? 'media' : 'upload'} size={24} />
        </span>
        <strong>{dev.phone ? 'Choose photos and videos' : 'Drop photos and videos here'}</strong>
        <span className="muted">{dev.phone ? 'Nothing is uploaded' : 'or click to choose · nothing is uploaded'}</span>
      </label>

      <div className="row-between" style={{ justifyContent: 'center', gap: 8 }}>
        {folderOk && (
          <button className="btn small" onClick={() => void openFolder()} disabled={!!adding}>
            <Icon name="media" size={16} /> Open a folder
          </button>
        )}
      </div>

      {error && <div className="banner warn">{error}</div>}
      {problems.length > 0 && (
        <div className="banner warn stack" style={{ gap: 4 }}>
          <strong>Some files could not be added</strong>
          {problems.slice(0, 5).map((p) => (
            <span key={p}>{p}</span>
          ))}
          <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setProblems([])}>
            Dismiss
          </button>
        </div>
      )}

      {adding && (
        <section className="card stack">
          <div className="row-between">
            <strong>Reading files…</strong>
            <span className="muted tabular">
              {adding.done} of {adding.total}
            </span>
          </div>
          <ProgressBar value={adding.total ? adding.done / adding.total : 0} />
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
            {PRESETS[settings.preset].blurb}.
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
            <span className="big">{formatEta(plan.total)}</span>
            <span className="small">
              Done around {clockTime(now + plan.total * 1000)}
              {firstGuess && ' · rough guess'}
            </span>
          </div>
          {active.map((x) => {
            const p = plan.byId[x.id];
            const running = x.state !== 'queued';
            const frac = settings ? jobFraction(x, settings, speeds, now) : 0;
            return (
              <div key={x.id} className="queue-row">
                <div className="file-row" style={{ padding: 0 }}>
                  <Thumb item={x} size={40} />
                  <span className="row-main">
                    <span className="row-title">{x.name}</span>
                    <span className="row-sub">
                      {stateWords(x.state)}
                      {x.attempt === 2 && ' (second try)'}
                      {running && ` · ${Math.round(frac * 100)}%`}
                    </span>
                    {p && (
                      <span className="eta">
                        <Icon name="clock" size={13} />
                        {running
                          ? `${formatEtaShort(p.end)} left`
                          : p.start < 1
                            ? `next · takes ${formatEtaShort(p.end - p.start)}`
                            : `starts in ${formatEtaShort(p.start)} · takes ${formatEtaShort(p.end - p.start)}`}
                      </span>
                    )}
                  </span>
                  <button className="icon-btn" aria-label={`Cancel ${x.name}`} onClick={() => engine.cancel(x.id)}>
                    <Icon name="close" size={16} />
                  </button>
                </div>
                {running && <ProgressBar value={frac} />}
              </div>
            );
          })}
        </section>
      )}

      {ready.length > 0 && (
        <Link href="/media" className="banner good row-between">
          <span>
            <Icon name="checkCircle" size={14} /> <strong>{ready.length} compressed {ready.length === 1 ? 'file is' : 'files are'} in Media</strong> · replace the
            originals there to free {formatSize(ready.reduce((n, x) => n + x.originalBytes - (x.result?.outputBytes ?? 0), 0))}
          </span>
          <span className="row-between" style={{ gap: 4 }}>
            Open Media <Icon name="chevron" size={16} />
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
                  extra={
                    gone(x) ? (
                      <span className="eta">Pick this file again to compress it</span>
                    ) : (
                      <span className="eta">
                        <Icon name="clock" size={13} />
                        takes {formatEtaShort(est(x))}
                      </span>
                    )
                  }
                  trailing={
                    <input
                      disabled={gone(x)}
                      type="checkbox"
                      className="check"
                      checked={!gone(x) && (picked ? picked.has(x.id) : true)}
                      onChange={() => toggle(x.id)}
                      aria-label={`Include ${x.name}`}
                    />
                  }
                />
              ))}
            </div>
            {todo.some((x) => x.state === 'failed') && (
              <p className="muted" style={{ fontSize: 13, padding: '0 4px 8px' }}>
                Tap a failed file to see why and try again.
              </p>
            )}
          </section>
          <div className="sticky-foot">
            <span style={{ display: 'grid' }}>
              <span>
                <strong>{chosen.length} files</strong> <span className="muted">· save about {formatSize(chosenSaving)}</span>
              </span>
              {chosen.length > 0 && (
                <span className="muted" style={{ fontSize: 13 }}>
                  <Icon name="clock" size={13} /> {active.length > 0 ? 'With the current queue, all done in' : 'Takes'} {formatEta(withChosen.total)} ·
                  around {clockTime(now + withChosen.total * 1000)}
                </span>
              )}
            </span>
            <button className="btn primary" disabled={busy || chosen.length === 0} onClick={start}>
              <Icon name="compress" size={18} /> Compress {chosen.length} {chosen.length === 1 ? 'file' : 'files'}
            </button>
          </div>
        </>
      )}

      {active.length > 0 && (
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          Keep this page open{dev.phone ? ' and the screen on' : ''} while it works.
        </p>
      )}

      {todo.length === 0 && active.length === 0 && !adding && items.length > 0 && (
        <p className="trust">All done. Your files are in Media.</p>
      )}
    </>
  );
}
