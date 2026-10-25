'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDevice } from '@/components/device';
import Compare from '@/components/Compare';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { ProgressBar, clockTime, stateWords, TrustBadge, useNow } from '@/components/ui';
import { saveFile, useFileUrl, useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { formatDate, formatDuration, formatEta, formatSize, savingPct } from '@/lib/format';
import { PRESETS, estimateSeconds, jobFraction, liveSpeeds, planQueue, qualityWords } from '@/lib/rules';
import { ACTIVE_STATES } from '@/lib/types';

export default function FileDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useLibrary();
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [askTick, setAskTick] = useState(0);
  const dev = useDevice();
  const item = data?.items.find((x) => x.id === id);
  const now = useNow(!!item && ACTIVE_STATES.includes(item.state));
  // Both copies are read from this device's storage.
  const origUrl = useFileUrl(() => engine.original(id, askTick > 0), `${id}-${askTick}-${item?.replaced}-${item?.state === 'new'}`);
  const outUrl = useFileUrl(() => engine.output(id), `${id}-${item?.result?.finishedAt}-${item?.state}`);

  if (!data) return <ScreenHeader title="File" back="/media" />;
  if (!item) {
    return (
      <>
        <ScreenHeader title="File not found" back="/media" />
        <p className="muted">It may have been removed from the library.</p>
      </>
    );
  }

  const r = item.result;
  const active = ACTIVE_STATES.includes(item.state);
  const speeds = liveSpeeds(data.items, data.settings, data.speeds, now);
  const slot = planQueue(data.items, data.settings, speeds, now).byId[id] ?? { start: 0, end: 0 };
  const frac = jobFraction(item, data.settings, speeds, now);
  const hasOutput = !!r && ['ready', 'freed', 'notWorthIt'].includes(item.state);
  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    setNote('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const decide = (action: 'accept' | 'keepOriginal') => act(() => engine.decide(id, action));
  const compress = () =>
    act(async () => {
      const r = await engine.enqueue([id]);
      if (r.missing.length) throw new Error('The original is no longer available on this page. Add the file again to compress it.');
    });
  const outName = r ? `${item.name.replace(/\.[^.]+$/, '')}-compressed.${r.outputExt}` : '';
  const saveCompressed = () =>
    act(async () => {
      const f = await engine.output(id);
      if (!f) throw new Error('The compressed copy is missing. Compress the file again.');
      const how = await saveFile(f, outName, dev.phone);
      if (how === 'downloaded') setNote(dev.phone ? 'Saved to Downloads. Your gallery shows it there.' : 'Saved to your Downloads folder.');
      if (how === 'shared') setNote('Saved.');
    });
  const saveOriginal = () =>
    act(async () => {
      const f = await engine.original(id, true);
      if (!f) throw new Error('The original is not available any more.');
      await saveFile(f, item.name, false);
    });
  const replace = () =>
    act(async () => {
      if (!confirm(`Replace "${item.name}" in its folder with the compressed copy? The original is deleted and this can't be undone.`)) return;
      await engine.replaceInFolder(id);
      setNote('Replaced. The folder now holds the compressed copy and the original is gone.');
    });

  return (
    <>
      <ScreenHeader
        title={item.name}
        subtitle={stateWords(item.state)}
        back="/media"
        actions={
          <button
            className="icon-btn"
            aria-label="Remove from library"
            title="Remove from library"
            onClick={() =>
              confirm('Remove this file from Compressly? The original file on your device is not touched.') &&
              void act(async () => {
                await engine.remove(id);
                router.push('/media');
              })
            }
          >
            <Icon name="trash" size={18} />
          </button>
        }
      />

      {error && <div className="banner warn">{error}</div>}
      {note && <div className="banner good">{note}</div>}

      {/* Outcome and the decision, like the app's Review screen */}
      {r && hasOutput && (
        <section className="card stack">
          <div className="big-saving">
            <span className="num" style={{ color: item.state === 'notWorthIt' ? 'var(--muted)' : 'var(--text)' }}>
              {savingPct(item.originalBytes, r.outputBytes)}%
            </span>
            <span className="muted">
              smaller · {formatSize(item.originalBytes)} → {formatSize(r.outputBytes)}
            </span>
            <span className={`chip ${r.ssim >= r.minSsim ? 'good' : 'warn'}`}>
              <Icon name={r.ssim >= r.minSsim ? 'check' : 'info'} size={14} /> {qualityWords(r.ssim)}
            </span>
          </div>
          {item.state === 'ready' && (
            <div className="row-between">
              <span className="muted">Happy with how it looks? Compare below first.</span>
              <span className="row-between" style={{ gap: 8 }}>
                <button className="btn" onClick={() => void decide('keepOriginal')}>
                  Keep original
                </button>
                <button className="btn primary" onClick={() => void decide('accept')}>
                  <Icon name="check" size={18} /> Use compressed · free {formatSize(item.originalBytes - r.outputBytes)}
                </button>
              </span>
            </div>
          )}
          {item.state === 'freed' && (
            <div className="row-between">
              <span className="chip accent">
                <Icon name="checkCircle" size={14} /> {item.replaced ? 'Replaced in its folder' : 'Freed'} · {formatSize(item.originalBytes - r.outputBytes)}
              </span>
              {!item.replaced && (
                <button className="btn ghost small" onClick={() => void decide('keepOriginal')}>
                  Undo, keep original
                </button>
              )}
            </div>
          )}
          {(item.state === 'ready' || item.state === 'freed') && !item.replaced && (
            <div className="stack" style={{ gap: 8 }}>
              {item.inFolder && engine.availability(id) !== 'gone' ? (
                <>
                  <button className="btn primary block" onClick={() => void replace()}>
                    <Icon name="compress" size={18} /> Replace the original in its folder
                  </button>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Writes the compressed copy into {item.folderPath?.replace(/\/[^/]+$/, '') || 'the folder'} and deletes the original.
                    {r.outputExt !== item.ext && ` The new file ends in .${r.outputExt}.`}
                  </span>
                </>
              ) : null}
              <button className={`btn block ${item.inFolder || item.state === 'ready' ? '' : 'primary'}`} onClick={() => void saveCompressed()}>
                <Icon name="download" size={18} /> {dev.phone ? 'Save compressed copy to this phone' : 'Save compressed copy'}
              </button>
              {!item.inFolder && (
                <span className="muted" style={{ fontSize: 13 }}>
                  {dev.phone
                    ? "A website can't change your gallery, so the original stays there until you delete it. Replacing it automatically is done by the Compressly app."
                    : 'To replace originals automatically, add files with "Open a folder" on the Compress page.'}
                </span>
              )}
            </div>
          )}
          {item.state === 'notWorthIt' && (
            <div className="banner info">
              <strong>Not worth compressing, kept as is.</strong> {item.reason} The compressed copy is still shown below so you can see why.
            </div>
          )}
        </section>
      )}

      {active && (
        <section className="card stack">
          <div className="row-between">
            <strong>{stateWords(item.state)}</strong>
            <span className="tabular muted">{item.state === 'queued' ? 'Waiting for its turn' : `${Math.round(frac * 100)}%`}</span>
          </div>
          <ProgressBar value={item.state === 'queued' ? 0 : frac} />
          <span className="muted tabular" style={{ fontSize: 14 }}>
            <Icon name="clock" size={14} />{' '}
            {item.state === 'queued'
              ? `${slot.start < 1 ? 'Starts next' : `Starts in ${formatEta(slot.start)}`}, then takes ${formatEta(slot.end - slot.start)} · done around ${clockTime(now + slot.end * 1000)}`
              : `${formatEta(slot.end)} left · done around ${clockTime(now + slot.end * 1000)}`}
            {item.attempt === 2 && ' · second try at a higher bitrate'}
          </span>
        </section>
      )}

      {(item.state === 'new' || item.state === 'failed' || item.state === 'keptOriginal') && (
        <section className="card stack">
          {item.state === 'failed' && <div className="banner warn">{item.reason}</div>}
          {item.state === 'keptOriginal' && <p className="muted">You kept the original. The compressed copy was discarded.</p>}
          <div className="row-between">
            <span className="muted">
              Estimated: {formatSize(item.originalBytes)} → ~{formatSize(item.estimateBytes)} with the {PRESETS[data.settings.preset].label} preset ·
              takes {formatEta(estimateSeconds(item, data.settings, speeds))}
            </span>
            <button className="btn primary" onClick={() => void compress()}>
              <Icon name="compress" size={18} /> {item.state === 'new' ? 'Compress' : 'Try again'}
            </button>
          </div>
        </section>
      )}

      {origUrl === '' && !item.replaced && (
        <div className="banner info row-between">
          <span>
            {item.inFolder
              ? 'Compressly needs your OK to read the original from its folder again.'
              : 'The original is not available after the page was reloaded. Pick the file again on the Compress page to compare or compress it.'}
          </span>
          {item.inFolder && (
            <button className="btn small" onClick={() => setAskTick((n) => n + 1)}>
              Allow
            </button>
          )}
        </div>
      )}

      {hasOutput && origUrl && outUrl ? (
        <Compare
          key={`${id}-${r!.finishedAt}`}
          kind={item.kind}
          before={origUrl}
          after={outUrl}
          beforeLabel={`Original · ${formatSize(item.originalBytes)}`}
          afterLabel={`Compressed · ${formatSize(r!.outputBytes)}`}
          fps={item.fps}
        />
      ) : (outUrl || origUrl) && (
        <section className="card">
          {item.kind === 'video' ? (
            <video src={hasOutput && outUrl ? outUrl : origUrl} controls playsInline style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 480 }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hasOutput && outUrl ? outUrl : origUrl} alt={item.name} style={{ width: '100%', borderRadius: 12, maxHeight: 520, objectFit: 'contain', background: '#000' }} />
          )}
        </section>
      )}

      {/* File detail: the only place technical words appear (DESIGN §4) */}
      <section className="card stack">
        <h2 className="section-label">Original</h2>
        <dl className="facts">
          <div><dt>Size</dt><dd>{formatSize(item.originalBytes)}</dd></div>
          <div><dt>Resolution</dt><dd>{item.width} × {item.height}</dd></div>
          {item.kind === 'video' && (
            <>
              <div><dt>Codec</dt><dd>{item.sourceCodec}</dd></div>
              <div><dt>Frame rate</dt><dd>{item.fps} fps</dd></div>
              <div><dt>Length</dt><dd>{formatDuration(item.durationSec ?? 0)}</dd></div>
              <div><dt>Video bitrate</dt><dd>{((item.bitrateKbps ?? 0) / 1000).toFixed(1)} Mbps</dd></div>
              <div><dt>Audio</dt><dd>{item.hasAudio ? `${Math.round(item.audioKbps ?? 0)} kbps` : 'None'}</dd></div>
            </>
          )}
          <div><dt>Added from</dt><dd>{item.inFolder ? item.folderPath : item.fromPhone ? 'Phone gallery' : 'This device'}</dd></div>
          <div><dt>Added</dt><dd>{formatDate(item.addedAt)}</dd></div>
        </dl>
        {r && (
          <>
            <h2 className="section-label" style={{ marginTop: 8 }}>Compressed</h2>
            <dl className="facts">
              <div><dt>Size</dt><dd>{formatSize(r.outputBytes)}</dd></div>
              <div><dt>Resolution</dt><dd>{item.width} × {item.height} (same)</dd></div>
              <div><dt>Method</dt><dd>{r.method}</dd></div>
              <div><dt>Preset</dt><dd>{PRESETS[r.preset].label}</dd></div>
              <div><dt>SSIM</dt><dd>{r.ssim.toFixed(4)} · {qualityWords(r.ssim)}</dd></div>
              <div><dt>Gate</dt><dd>≥ {r.minSsim} · {r.ssim >= r.minSsim ? 'passed' : 'failed'}</dd></div>
              <div><dt>Took</dt><dd>{r.seconds.toFixed(1)} s</dd></div>
              <div><dt>Finished</dt><dd>{formatDate(r.finishedAt)}</dd></div>
            </dl>
            {r.notes.length > 0 && (
              <ul className="notes">
                {r.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="row-between" style={{ justifyContent: 'flex-start', gap: 8 }}>
          {origUrl && !item.replaced && (
            <button className="btn small" onClick={() => void saveOriginal()}>
              <Icon name="download" size={16} /> Original
            </button>
          )}
          {hasOutput && (
            <button className="btn small" onClick={() => void saveCompressed()}>
              <Icon name="download" size={16} /> Compressed
            </button>
          )}
        </div>
      </section>
      <TrustBadge />
    </>
  );
}
