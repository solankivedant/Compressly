'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { formatDuration } from '@/lib/format';
import { Segmented } from './ui';

type Mode = 'side' | 'slider';

interface Props {
  kind: 'video' | 'photo';
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  fps?: number;
  /** Width ÷ height as shown (upright), so tall phone videos show tall. */
  aspect?: number;
}

/** Before/after viewer: side by side or a drag slider, with zoom. Videos play locked together. */
export default function Compare({ kind, before, after, beforeLabel, afterLabel, fps = 30, aspect = 16 / 9 }: Props) {
  const tall = aspect < 1;
  const frameStyle = { '--ar': String(aspect) } as React.CSSProperties;
  const [mode, setMode] = useState<Mode>('slider');
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [failed, setFailed] = useState<{ before?: boolean; after?: boolean }>({});
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);

  // The original drives the clock; the compressed copy follows it.
  useEffect(() => {
    if (kind !== 'video') return;
    let raf = 0;
    const tick = () => {
      const va = a.current;
      const vb = b.current;
      if (va && vb) {
        if (Math.abs(vb.currentTime - va.currentTime) > 0.06) vb.currentTime = va.currentTime;
        if (va.paused !== vb.paused) {
          if (va.paused) vb.pause();
          else void vb.play().catch(() => {});
        }
        setT(va.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, mode]);

  const toggle = () => {
    const va = a.current;
    const vb = b.current;
    if (!va || !vb) return;
    if (va.paused) {
      vb.currentTime = va.currentTime;
      void Promise.all([va.play(), vb.play()]).catch(() => {});
      setPlaying(true);
    } else {
      va.pause();
      vb.pause();
      setPlaying(false);
    }
  };

  const seek = (to: number) => {
    const v = Math.max(0, Math.min(dur, to));
    if (a.current) a.current.currentTime = v;
    if (b.current) b.current.currentTime = v;
    setT(v);
  };

  const scale = Number(zoom);
  const style = { transform: `scale(${scale})`, transformOrigin: `${focus.x}% ${focus.y}%` };

  const el = (which: 'before' | 'after') => {
    const src = which === 'before' ? before : after;
    if (kind === 'photo') {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={which === 'before' ? 'Original' : 'Compressed'} className="cmp-media" style={style} draggable={false} />;
    }
    return (
      <video
        ref={which === 'before' ? a : b}
        src={src}
        className="cmp-media"
        style={style}
        muted={which === 'after'}
        playsInline
        loop
        preload="auto"
        onLoadedMetadata={(e) => which === 'before' && setDur(e.currentTarget.duration)}
        onError={() => setFailed((f) => ({ ...f, [which]: true }))}
      />
    );
  };

  // Move the zoom focus with the pointer, so 2× / 4× can inspect any corner.
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale === 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    setFocus({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <section className="card compare">
      <div className="cmp-toolbar">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'slider', label: 'Slider' },
            { value: 'side', label: 'Side by side' },
          ]}
        />
        <Segmented
          value={zoom}
          onChange={setZoom}
          options={[
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
            { value: '4', label: '4×' },
          ]}
        />
      </div>

      {mode === 'side' ? (
        <div className={`cmp-side ${tall ? 'tall' : ''}`}>
          <figure>
            <div className="cmp-frame" style={frameStyle} onPointerMove={onMove}>{el('before')}</div>
            <figcaption>{beforeLabel}</figcaption>
          </figure>
          <figure>
            <div className="cmp-frame" style={frameStyle} onPointerMove={onMove}>{el('after')}</div>
            <figcaption>{afterLabel}</figcaption>
          </figure>
        </div>
      ) : (
        <figure>
          <div className="cmp-frame cmp-slider" style={frameStyle} onPointerMove={onMove}>
            {el('before')}
            <div className="cmp-over" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              {el('after')}
            </div>
            <div className="cmp-line" style={{ left: `${split}%` }}>
              <span className="cmp-knob" aria-hidden="true">‹ ›</span>
            </div>
            <span className="cmp-tag left">Original</span>
            <span className="cmp-tag right">Compressed</span>
            <input
              type="range"
              className="cmp-range"
              min={0}
              max={100}
              step={0.5}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Drag to compare original and compressed"
            />
          </div>
          <figcaption>
            {beforeLabel} · {afterLabel}
          </figcaption>
        </figure>
      )}

      {kind === 'video' && (
        <div className="cmp-transport">
          <button className="icon-btn" onClick={() => seek(t - 1 / fps)} aria-label="Back one frame">‹</button>
          <button className="btn primary small" onClick={toggle}>
            <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pause' : 'Play'}
          </button>
          <button className="icon-btn" onClick={() => seek(t + 1 / fps)} aria-label="Forward one frame">›</button>
          <input type="range" min={0} max={dur || 0} step={0.01} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" />
          <span className="tabular muted">
            {formatDuration(t)} / {formatDuration(dur)}
          </span>
        </div>
      )}

      {scale > 1 && <p className="hint">Touch or point at the picture to zoom there.</p>}
      {(failed.before || failed.after) && (
        <p className="banner warn">
          This browser can&apos;t play this video. In Settings, choose &ldquo;Plays everywhere&rdquo; and compress it again.
        </p>
      )}
    </section>
  );
}
