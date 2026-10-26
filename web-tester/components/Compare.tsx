'use client';

import { useEffect, useRef, useState } from 'react';

type Mode = 'side' | 'slider';

interface Props {
  kind: 'image' | 'video';
  originalSrc: string;
  outputSrc: string;
  originalLabel: string;
  outputLabel: string;
}

export default function Compare({ kind, originalSrc, outputSrc, originalLabel, outputLabel }: Props) {
  const [mode, setMode] = useState<Mode>('side');
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(1);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errors, setErrors] = useState<{ a?: boolean; b?: boolean }>({});

  // Keep the compressed video locked to the original's clock.
  useEffect(() => {
    if (kind !== 'video') return;
    let raf = 0;
    const tick = () => {
      const va = a.current, vb = b.current;
      if (va && vb) {
        if (Math.abs(vb.currentTime - va.currentTime) > 0.08) vb.currentTime = va.currentTime;
        if (va.paused !== vb.paused) (va.paused ? vb.pause() : vb.play().catch(() => {}));
        setTime(va.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, mode]);

  const togglePlay = () => {
    const va = a.current, vb = b.current;
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

  const seek = (t: number) => {
    if (a.current) a.current.currentTime = t;
    if (b.current) b.current.currentTime = t;
    setTime(t);
  };

  const step = (frames: number) => seek(Math.max(0, Math.min(duration, time + frames / 30)));

  const media = (which: 'a' | 'b', src: string, extraClass = '') =>
    kind === 'video' ? (
      <video
        ref={which === 'a' ? a : b}
        src={src}
        className={`media ${extraClass}`}
        style={{ transform: `scale(${zoom})` }}
        muted={which === 'b'}
        loop
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => which === 'a' && setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={() => setErrors((x) => ({ ...x, [which]: true }))}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`media ${extraClass}`} style={{ transform: `scale(${zoom})` }} />
    );

  return (
    <section className="card compare">
      <div className="compare-bar">
        <div className="segmented" role="tablist">
          <button className={mode === 'side' ? 'on' : ''} onClick={() => setMode('side')}>Side by side</button>
          <button className={mode === 'slider' ? 'on' : ''} onClick={() => setMode('slider')}>Slider</button>
        </div>
        <div className="segmented">
          {[1, 2, 4].map((z) => (
            <button key={z} className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>{z}×</button>
          ))}
        </div>
      </div>

      {mode === 'side' ? (
        <div className="side">
          <figure>
            <div className="frame">{media('a', originalSrc)}</div>
            <figcaption>{originalLabel}</figcaption>
          </figure>
          <figure>
            <div className="frame">{media('b', outputSrc)}</div>
            <figcaption>{outputLabel}</figcaption>
          </figure>
        </div>
      ) : (
        <figure>
          <div className="frame slider-frame">
            {media('a', originalSrc)}
            <div className="overlay" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>{media('b', outputSrc)}</div>
            <div className="divider" style={{ left: `${split}%` }} />
            <span className="tag left">Original</span>
            <span className="tag right">Compressed</span>
            <input
              className="split"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Compare position"
            />
          </div>
          <figcaption>{originalLabel} · {outputLabel}</figcaption>
        </figure>
      )}

      {kind === 'video' && (
        <div className="transport">
          <button className="btn small" onClick={() => step(-1)} aria-label="Back one frame">‹</button>
          <button className="btn small primary" onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
          <button className="btn small" onClick={() => step(1)} aria-label="Forward one frame">›</button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
          />
          <span className="mono">{time.toFixed(2)} / {duration.toFixed(2)} s</span>
        </div>
      )}

      {(errors.a || errors.b) && (
        <p className="note warn">
          This browser can&apos;t play the {errors.a && errors.b ? 'files' : errors.a ? 'original' : 'compressed file'}.
          HEVC needs Edge/Safari or Chrome with hardware HEVC support. Try the H.264 codec for preview.
        </p>
      )}
    </section>
  );
}
