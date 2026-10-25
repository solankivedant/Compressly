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
import { compressedName, formatDate, formatDuration, formatEta, formatSize, savingPct } from '@/lib/format';
import { estimateSeconds, jobFraction, liveSpeeds, planQueue, qualityWords } from '@/lib/rules';
import { ACTIVE_STATES } from '@/lib/types';

const sameType = (a: string, b?: string) => !!b && a.replace('jpeg', 'jpg') === b.replace('jpeg', 'jpg');

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
  const canReplace = !!item.inFolder && engine.availability(id) !== 'gone' && (!!item.folderPath?.includes('/') || sameType(item.ext, r?.outputExt));
  const replaceHint = item.inFolder
    ? 'This photo became a different file type, so download it instead.'
    : dev.ios
      ? "iPhone browsers can't change your gallery. Download it, then delete the original."
      : 'To replace the original, add the file again with "Choose photos and videos" in Chrome.';
  const saveCompressed = (share: boolean) =>
    act(async () => {
      const f = await engine.output(id);
      if (!f) throw new Error('The compressed copy is missing. Compress the file again.');
      const how = await saveFile(f, compressedName(item), share);
      if (how === 'downloaded') setNote('Saved to Downloads.');
      if (how === 'shared') setNote('Saved.');
      if (how !== 'cancelled' && item.state === 'ready') await engine.decide(id, 'accept');
    });
  const saveOriginal = () =>
    act(async () => {
      const f = await engine.original(id, true);
      if (!f) throw new Error('The original is not available any more.');
      await saveFile(f, item.name, false);
    });
  const replace = () =>
    act(async () => {
      if (!confirm(`Replace "${item.name}" with the smaller copy? This can't be undone.`)) return;
      await engine.replaceInFolder(id);
      setNote('Done. The original now takes less space.');
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

          {item.state === 'freed' && (
            <span className="chip accent" style={{ justifySelf: 'start' }}>
              <Icon name="checkCircle" size={14} /> {item.replaced ? 'Original replaced' : 'Done'} · saved {formatSize(item.originalBytes - r.outputBytes)}
            </span>
          )}

          {(item.state === 'ready' || item.state === 'freed') && !item.replaced && (
            <div className="stack" style={{ gap: 8 }}>
              {canReplace && (
                <button className="btn primary block" onClick={() => void replace()}>
                  <Icon name="compress" size={18} /> Replace original · free {formatSize(item.originalBytes - r.outputBytes)}
                </button>
              )}
              <div className="two">
                <button className={`btn block ${canReplace ? '' : 'primary'}`} onClick={() => void saveCompressed(false)}>
                  <Icon name="download" size={18} /> Download
                </button>
                {dev.phone ? (
                  <button className="btn block" onClick={() => void saveCompressed(true)}>
                    <Icon name="upload" size={18} /> Share / Save
                  </button>
                ) : item.state === 'ready' ? (
                  <button className="btn block" onClick={() => void decide('keepOriginal')}>
                    Keep original
                  </button>
                ) : null}
              </div>
              {dev.phone && item.state === 'ready' && (
                <button className="btn ghost small" style={{ justifySelf: 'center' }} onClick={() => void decide('keepOriginal')}>
                  Keep original instead
                </button>
              )}
              {!canReplace && (
                <span className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
                  {replaceHint}
                </span>
              )}
            </div>
          )}
          {item.state === 'notWorthIt' && (
            <div className="banner info">
              <strong>Not worth compressing.</strong> The saving was too small or the quality dropped, so your original is kept as is.
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
            {item.attempt === 2 && ' · trying again for better quality'}
          </span>
        </section>
      )}

      {(item.state === 'new' || item.state === 'failed' || item.state === 'keptOriginal') && (
        <section className="card stack">
          {item.state === 'failed' && <div className="banner warn">{item.reason}</div>}
          {item.state === 'keptOriginal' && <p className="muted">You kept the original. The compressed copy was discarded.</p>}
          <div className="row-between">
            <span className="muted">
              {formatSize(item.originalBytes)} → ~{formatSize(item.estimateBytes)} · takes {formatEta(estimateSeconds(item, data.settings, speeds))}
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
            {item.inFolder ? 'Allow Compressly to open the original again.' : 'Add this file again on the Compress page to compare it.'}
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
          aspect={item.width && item.height ? item.width / item.height : undefined}
        />
      ) : (outUrl || origUrl) && (
        <section className="card">
          {item.kind === 'video' ? (
            <video src={hasOutput && outUrl ? outUrl : origUrl} controls playsInline style={{ display: 'block', width: '100%', borderRadius: 12, background: '#000', maxHeight: '70vh' }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hasOutput && outUrl ? outUrl : origUrl} alt={item.name} style={{ display: 'block', width: '100%', borderRadius: 12, maxHeight: '70vh', objectFit: 'contain', background: '#000' }} />
          )}
        </section>
      )}

      {/* The few facts people care about; technical ones are folded away (DESIGN §4). */}
      <section className="card stack">
        <dl className="facts">
          <div><dt>Before</dt><dd>{formatSize(item.originalBytes)}</dd></div>
          {r && <div><dt>After</dt><dd>{formatSize(r.outputBytes)}</dd></div>}
          {r && <div><dt>Saved</dt><dd>{formatSize(Math.max(0, item.originalBytes - r.outputBytes))}</dd></div>}
          {r && <div><dt>Quality</dt><dd>{qualityWords(r.ssim)}</dd></div>}
          <div><dt>Picture size</dt><dd>{item.width} × {item.height}{r ? ' (unchanged)' : ''}</dd></div>
          {item.kind === 'video' && <div><dt>Length</dt><dd>{formatDuration(item.durationSec ?? 0)}</dd></div>}
        </dl>
        <details className="more">
          <summary>More details</summary>
          <dl className="facts">
            {item.kind === 'video' && (
              <>
                <div><dt>Video format</dt><dd>{item.sourceCodec}</dd></div>
                <div><dt>Frame rate</dt><dd>{item.fps} fps</dd></div>
                <div><dt>Sound</dt><dd>{item.hasAudio ? 'Yes' : 'No'}</dd></div>
              </>
            )}
            {r && <div><dt>Made with</dt><dd>{r.method.split(' · ').slice(0, 2).join(' · ')}</dd></div>}
            {r && <div><dt>Quality score</dt><dd>{Math.round(r.ssim * 1000) / 10} / 100</dd></div>}
            {r && <div><dt>Took</dt><dd>{formatEta(r.seconds).replace('about ', '')}</dd></div>}
            <div><dt>Added</dt><dd>{formatDate(item.addedAt)}</dd></div>
          </dl>
        </details>
        {origUrl && !item.replaced && (
          <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => void saveOriginal()}>
            <Icon name="download" size={16} /> Download original
          </button>
        )}
      </section>
      <TrustBadge />
    </>
  );
}
