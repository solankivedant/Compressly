'use client';

import { useEffect, useRef, useState } from 'react';
import Compare from '@/components/Compare';
import type { JobResult, JobStatus } from '@/lib/jobs';
import {
  VIDEO_PRESETS,
  formatBytes,
  qualityWords,
  type ImageFormat,
  type VideoCodec,
  type VideoPreset,
} from '@/lib/quality';

interface JobView {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  result?: JobResult;
  error?: string;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|avi|3gp)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|heic|heif|tiff?|gif)$/i;

function guessMime(file: File): string {
  if (file.type) return file.type;
  if (VIDEO_EXT.test(file.name)) return 'video/mp4';
  if (IMAGE_EXT.test(file.name)) return 'image/jpeg';
  return '';
}

const DEFAULT_QUALITY: Record<ImageFormat, number> = { jpeg: 82, webp: 80, avif: 60 };

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preset, setPreset] = useState<VideoPreset>('balanced');
  const [codec, setCodec] = useState<VideoCodec>('hevc');
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(DEFAULT_QUALITY.jpeg);
  const [upload, setUpload] = useState<number | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState('');
  const [hevcOk, setHevcOk] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mime = file ? guessMime(file) : '';
  const kind = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : null;
  const busy = upload !== null || (job !== null && job.status !== 'done' && job.status !== 'error');

  useEffect(() => {
    setHevcOk(document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '');
  }, []);

  // Poll the job until it finishes.
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/jobs/${job.id}`);
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? 'Lost the job.');
        setJob(null);
      } else setJob(j);
    }, 600);
    return () => clearTimeout(t);
  }, [job]);

  const choose = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setJob(null);
    setError('');
  };

  const start = () => {
    if (!file || !kind) return;
    setError('');
    setJob(null);
    const qs = new URLSearchParams(kind === 'video' ? { preset, codec } : { format, quality: String(quality) });
    // XHR rather than fetch so we can show upload progress for big videos.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/jobs?${qs}`);
    xhr.setRequestHeader('Content-Type', mime);
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && setUpload(e.loaded / e.total);
    xhr.onload = () => {
      setUpload(null);
      try {
        const j = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) setError(j.error ?? `Upload failed (${xhr.status}).`);
        else setJob(j);
      } catch {
        setError(`Upload failed (${xhr.status}).`);
      }
    };
    xhr.onerror = () => {
      setUpload(null);
      setError('Upload failed. Is the dev server running?');
    };
    setUpload(0);
    xhr.send(file);
  };

  const r = job?.status === 'done' ? job.result : undefined;
  const saved = r ? 1 - r.outputBytes / r.originalBytes : 0;
  const q = r ? qualityWords(r.ssim, r.minSsim) : null;

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Compressly web tester</h1>
          <p className="muted">
            Same-resolution re-encode with the app&apos;s presets, an SSIM quality check, and a side-by-side compare.
            Files stay on this computer.
          </p>
        </div>
      </header>

      <section
        className={`card drop ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {file ? (
          <>
            <strong>{file.name}</strong>
            <span className="muted">{formatBytes(file.size)} · {kind ?? 'unsupported type'} · click to change</span>
          </>
        ) : (
          <>
            <strong>Drop a photo or video here</strong>
            <span className="muted">or click to choose a file</span>
          </>
        )}
      </section>

      {kind && (
        <section className="card options">
          {kind === 'video' ? (
            <>
              <label>
                <span>Preset</span>
                <div className="segmented">
                  {(Object.keys(VIDEO_PRESETS) as VideoPreset[]).map((p) => (
                    <button key={p} className={preset === p ? 'on' : ''} onClick={() => setPreset(p)} disabled={busy}>
                      {VIDEO_PRESETS[p].label}
                    </button>
                  ))}
                </div>
                <small className="muted">Gate: SSIM ≥ {VIDEO_PRESETS[preset].minSsim}</small>
              </label>
              <label>
                <span>Codec</span>
                <div className="segmented">
                  <button className={codec === 'hevc' ? 'on' : ''} onClick={() => setCodec('hevc')} disabled={busy}>HEVC</button>
                  <button className={codec === 'h264' ? 'on' : ''} onClick={() => setCodec('h264')} disabled={busy}>H.264</button>
                </div>
                <small className="muted">
                  {codec === 'hevc'
                    ? hevcOk === false
                      ? 'This browser may not play HEVC. Use H.264 to preview.'
                      : 'What the app uses.'
                    : 'App fallback, bitrate × 1.4. Plays everywhere.'}
                </small>
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Format</span>
                <div className="segmented">
                  {(['jpeg', 'webp', 'avif'] as ImageFormat[]).map((f) => (
                    <button
                      key={f}
                      className={format === f ? 'on' : ''}
                      onClick={() => {
                        setFormat(f);
                        setQuality(DEFAULT_QUALITY[f]);
                      }}
                      disabled={busy}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </label>
              <label className="grow">
                <span>Quality <b className="mono">{quality}</b></span>
                <input type="range" min={30} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} disabled={busy} />
              </label>
            </>
          )}
          <button className="btn primary big" onClick={start} disabled={busy}>
            {busy ? 'Working…' : 'Compress'}
          </button>
        </section>
      )}

      {(upload !== null || (job && job.status !== 'done' && job.status !== 'error')) && (
        <section className="card">
          <div className="row">
            <span>{upload !== null ? 'Uploading to local server' : job?.message}</span>
            <span className="mono">{Math.round(((upload ?? job?.progress) || 0) * 100)}%</span>
          </div>
          <div className="bar"><div style={{ width: `${((upload ?? job?.progress) || 0) * 100}%` }} /></div>
        </section>
      )}

      {(error || job?.error) && <p className="note bad">{error || job?.error}</p>}

      {r && job && q && (
        <>
          <section className="card stats">
            <div className="hero">
              <span className="big-num" data-tone={saved > 0 ? 'good' : 'bad'}>
                {saved > 0 ? `${(saved * 100).toFixed(1)}%` : `+${(-saved * 100).toFixed(1)}%`}
              </span>
              <span className="muted">{saved > 0 ? 'smaller' : 'bigger'}</span>
            </div>
            <dl>
              <div><dt>Original</dt><dd>{formatBytes(r.originalBytes)}</dd></div>
              <div><dt>Compressed</dt><dd>{formatBytes(r.outputBytes)}</dd></div>
              <div><dt>Saved</dt><dd>{formatBytes(Math.max(0, r.originalBytes - r.outputBytes))}</dd></div>
              <div><dt>Resolution</dt><dd>{r.width}×{r.height} (unchanged)</dd></div>
              <div>
                <dt>SSIM</dt>
                <dd><span className="mono">{r.ssim.toFixed(4)}</span> <span className="pill" data-tone={q.tone}>{q.words}</span></dd>
              </div>
              {r.kind === 'video' && (
                <>
                  <div><dt>Codec</dt><dd>{r.codec}</dd></div>
                  <div><dt>Bitrate</dt><dd>{((r.sourceKbps ?? 0) / 1000).toFixed(1)} → {((r.targetKbps ?? 0) / 1000).toFixed(1)} Mbps</dd></div>
                  <div><dt>Frame rate</dt><dd>{r.fps} fps · {r.durationSec?.toFixed(1)} s</dd></div>
                </>
              )}
              <div><dt>Took</dt><dd>{r.seconds.toFixed(1)} s</dd></div>
              <div><dt>App verdict</dt><dd><span className="pill" data-tone={r.passed ? 'good' : 'bad'}>{r.passed ? 'Would replace original' : 'Would keep original'}</span></dd></div>
            </dl>
            {r.notes.length > 0 && (
              <ul className="notes">{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            )}
            <a className="btn" href={`/api/jobs/${job.id}/output?download`}>Download compressed</a>
          </section>

          <Compare
            key={job.id}
            kind={r.kind}
            originalSrc={`/api/jobs/${job.id}/original`}
            outputSrc={`/api/jobs/${job.id}/output`}
            originalLabel={`Original · ${formatBytes(r.originalBytes)}`}
            outputLabel={`Compressed · ${formatBytes(r.outputBytes)}`}
          />
        </>
      )}
    </main>
  );
}
