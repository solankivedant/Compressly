'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { askConfirm } from '@/components/Dialog';
import { downloadCopy, replaceOnDevice } from '@/components/replace';
import Compare from '@/components/Compare';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';
import { ProgressBar, clockTime, stateWords, TrustBadge, useNow } from '@/components/ui';
import { useFileUrl, useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { formatAfter, formatBefore, formatDate, formatDuration, formatEta, formatSize, savingPct } from '@/lib/format';
import { estimateSeconds, jobFraction, liveSpeeds, planQueue, qualityWords } from '@/lib/rules';
import { ACTIVE_STATES } from '@/lib/types';

export default function FileDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useLibrary();
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [askTick, setAskTick] = useState(0);
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
  // Where the original lives, as far as the browser tells us (a folder path, or just the file's name).
  const where = item.folderPath?.includes('/') ? item.folderPath.replace(/\/[^/]+$/, '') : 'its original place';
  const lowQuality = !!r && r.ssim < r.minSsim;
  const replace = () =>
    act(async () => {
      const msg = await replaceOnDevice(item);
      if (msg) setNote(msg);
    });
  const keepBoth = () =>
    act(async () => {
      const msg = await downloadCopy(item);
      if (msg) setNote(msg);
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
              void act(async () => {
                if (!(await askConfirm({ title: 'Remove from Compressly?', body: 'The file on your device is not touched.', ok: 'Remove', danger: true }))) return;
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
            <span className={`chip ${lowQuality ? 'warn' : 'good'}`}>
              <Icon name={lowQuality ? 'info' : 'check'} size={14} /> {lowQuality ? 'Check closely' : qualityWords(r.ssim)}
            </span>
          </div>

          {item.replaced && (
            <span className="chip accent" style={{ justifySelf: 'start' }}>
              <Icon name="checkCircle" size={14} /> Replaced in {where} · saved {formatSize(item.originalBytes - r.outputBytes)}
            </span>
          )}

          {item.keptBoth && !item.replaced && (
            <span className="chip" style={{ justifySelf: 'start' }}>
              <Icon name="download" size={14} /> New copy saved · original kept
            </span>
          )}

          {(item.state === 'ready' || item.state === 'freed') && !item.replaced && (
            <div className="decide">
              <button className="btn block" onClick={() => void decide('keepOriginal')}>
                Keep original
              </button>
              <button className="btn block" onClick={() => void keepBoth()}>
                <Icon name="download" size={18} /> Keep both
              </button>
              <button className="btn primary block" onClick={() => void replace()}>
                <Icon name="check" size={18} /> Replace in device
              </button>
            </div>
          )}
          {item.state === 'notWorthIt' && (
            <div className="banner info">
              <strong>Not smaller.</strong> The compressed copy came out the same size or bigger, so your original is kept as is.
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

      {origUrl === '' && item.kind !== 'doc' && (
        <div className="banner info row-between">
          <span>
            {item.replaced
              ? `Tap to show the ${item.kind} on your device.`
              : item.inFolder
                ? 'Allow Compressly to open the original again.'
                : 'Add this file again on the Compress page to compare it.'}
          </span>
          {item.inFolder && (
            <button className="btn small primary" onClick={() => setAskTick((n) => n + 1)}>
              <Icon name="play" size={14} /> Show
            </button>
          )}
        </div>
      )}

      {item.kind === 'doc' ? null : hasOutput && origUrl && outUrl ? (
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
        <div className="ba">
          <div>
            <span className="ba-label">Before</span>
            <b>{formatBefore(item)}</b>
            <span className="tabular">{formatSize(item.originalBytes)}</span>
          </div>
          <span className="ba-arrow" aria-hidden="true">→</span>
          <div>
            <span className="ba-label">After</span>
            <b>{r ? formatAfter(item, r) : '—'}</b>
            <span className="tabular">{r ? formatSize(r.outputBytes) : `~${formatSize(item.estimateBytes)}`}</span>
          </div>
        </div>
        {r && r.outputBytes < item.originalBytes && (
          <span className="saved-tag">
            <Icon name="check" size={14} /> {formatSize(item.originalBytes - r.outputBytes)} saved
          </span>
        )}
        <dl className="facts">
          {r && item.kind !== 'doc' && <div><dt>Quality</dt><dd>{qualityWords(r.ssim)}</dd></div>}
          {item.kind !== 'doc' && <div><dt>Picture size</dt><dd>{item.width} × {item.height}{r ? ' (unchanged)' : ''}</dd></div>}
          {item.kind === 'video' && <div><dt>Length</dt><dd>{formatDuration(item.durationSec ?? 0)}</dd></div>}
          {r?.images && <div><dt>Pictures inside</dt><dd>{r.images.smaller} of {r.images.total} made smaller</dd></div>}
          {item.kind === 'doc' && r && <div><dt>Text and layout</dt><dd>Unchanged</dd></div>}
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
      </section>
      <TrustBadge />
    </>
  );
}
