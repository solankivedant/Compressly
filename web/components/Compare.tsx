'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '@/lib/format';
import Icon from './Icon';
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

const MAX_ZOOM = 8;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Before/after viewer: drag slider or side by side, with zoom (buttons, pinch or wheel) and drag to move around.
 * "Full screen" fills the screen for close inspection. Videos play locked together.
 */
export default function Compare({ kind, before, after, beforeLabel, afterLabel, fps = 30, aspect = 16 / 9 }: Props) {
  const tall = aspect < 1;
  const [mode, setMode] = useState<Mode>('slider');
  const [full, setFull] = useState(false);
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(1);
  // Pan as a fraction of the frame, so both copies stay lined up whatever their pixel size.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [failed, setFailed] = useState<{ before?: boolean; after?: boolean }>({});
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);

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
  }, [kind, mode, full]);

  // Full screen: no page scrolling behind it, and Back / Esc closes it.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  const setZoomKeep = (z: number) => {
    const nz = clamp(z, 1, MAX_ZOOM);
    const m = (nz - 1) / 2;
    setZoom(nz);
    setPan((p) => ({ x: clamp(p.x, -m, m), y: clamp(p.y, -m, m) }));
  };

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

  // One finger / mouse drag moves the zoomed picture; two fingers pinch to zoom.
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(p.x - q.x, p.y - q.y), zoom };
    }
    if (zoom > 1 || pointers.current.size === 2) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [p, q] = [...pointers.current.values()];
      setZoomKeep((gesture.current.zoom * Math.hypot(p.x - q.x, p.y - q.y)) / Math.max(1, gesture.current.dist));
      return;
    }
    if (zoom === 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    const m = (zoom - 1) / 2;
    setPan((pp) => ({
      x: clamp(pp.x + (e.clientX - last.x) / r.width, -m, m),
      y: clamp(pp.y + (e.clientY - last.y) / r.height, -m, m),
    }));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!full) return;
    setZoomKeep(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  };
  const handlers = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, onWheel };

  const style = { transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})` };
  const frameStyle = { '--ar': String(aspect) } as React.CSSProperties;
  // While zoomed (or in full screen) touches move the picture instead of scrolling the page.
  const frameCls = `cmp-frame ${zoom > 1 || full ? 'grab' : ''}`;

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

  // Dragging across the picture moves the divider only at normal size; when zoomed, the bar below does it.
  const dragSplit = zoom === 1 && !full;

  return (
    <section className={`card compare ${full ? 'cmp-full' : ''} ${tall ? 'is-tall' : ''}`}>
      <div className="cmp-toolbar">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'slider', label: 'Slider' },
            { value: 'side', label: 'Side by side' },
          ]}
        />
        <div className="zoom-ctl">
          <button className="icon-btn" onClick={() => setZoomKeep(zoom / 1.5)} disabled={zoom <= 1} aria-label="Zoom out">−</button>
          <button className="zoom-val tabular" onClick={() => setZoomKeep(1)} title="Back to normal size">
            {zoom.toFixed(1)}×
          </button>
          <button className="icon-btn" onClick={() => setZoomKeep(zoom * 1.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
          <button className="icon-btn" onClick={() => setFull(!full)} aria-label={full ? 'Close full screen' : 'Full screen'} title={full ? 'Close' : 'Full screen'}>
            <Icon name={full ? 'close' : 'expand'} size={18} />
          </button>
        </div>
      </div>

      {mode === 'side' ? (
        <div className={`cmp-side ${tall ? 'tall' : ''}`}>
          <figure>
            <div className={frameCls} style={frameStyle} {...handlers}>{el('before')}</div>
            <figcaption>{beforeLabel}</figcaption>
          </figure>
          <figure>
            <div className={frameCls} style={frameStyle} {...handlers}>{el('after')}</div>
            <figcaption>{afterLabel}</figcaption>
          </figure>
        </div>
      ) : (
        <figure>
          <div className={`${frameCls} cmp-slider`} style={frameStyle} {...(dragSplit ? {} : handlers)}>
            {el('before')}
            <div className="cmp-over" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              {el('after')}
            </div>
            <div className="cmp-line" style={{ left: `${split}%` }}>
              <span className="cmp-knob" aria-hidden="true">‹ ›</span>
            </div>
            <span className="cmp-tag left">Original</span>
            <span className="cmp-tag right">Compressed</span>
            {dragSplit && (
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
            )}
          </div>
          {!dragSplit && (
            <input type="range" className="split-bar" min={0} max={100} step={0.5} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Move the divider" />
          )}
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

      {zoom > 1 && <p className="hint">Drag the picture to look around. Pinch or use + and − to zoom.</p>}
      {(failed.before || failed.after) && (
        <p className="banner warn">
          This browser can&apos;t play this video. In Settings, choose &ldquo;Plays everywhere&rdquo; and compress it again.
        </p>
      )}
    </section>
  );
}
