'use client';

import { useEffect, useState } from 'react';
import { askConfirm } from '@/components/Dialog';
import Icon from '@/components/Icon';
import { DeviceCard, NotificationsCard } from '@/components/PhoneCards';
import { ScreenHeader } from '@/components/Shell';
import { Segmented } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { PHOTO_FORMATS, PRESETS } from '@/lib/rules';
import type { PhotoFormat, Preset, Settings, VideoCodec } from '@/lib/types';

type Theme = 'dark' | 'light' | 'system';

function applyTheme(t: Theme) {
  try {
    localStorage.setItem('theme', t);
  } catch {}
  const resolved = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = resolved;
}

interface Figure {
  value: string;
  label: string;
  tone?: 'primary' | 'tertiary';
}

/** A choice row like the app's Settings: name, a green tag, and figures on the right. */
function Option<T extends string>(p: { value: T; current: T; onPick: (v: T) => void; title: string; tag?: string; desc?: string; figures?: Figure[] }) {
  const on = p.value === p.current;
  return (
    <button type="button" role="radio" aria-checked={on} className={`option-card ${on ? 'on' : ''}`} onClick={() => p.onPick(p.value)}>
      <span className="radio" />
      <span className="grow">
        <span className="t">{p.title}</span>
        {p.tag && <span className="opt-tag">{p.tag}</span>}
        {p.desc && <span className="d">{p.desc}</span>}
      </span>
      {p.figures?.map((f, i) => (
        <span key={f.label} className={`opt-fig ${i ? 'sep' : ''} ${on && f.tone ? f.tone : ''}`}>
          <b>{f.value}</b>
          <small>{f.label}</small>
        </span>
      ))}
    </button>
  );
}

export default function SettingsPage() {
  const { data } = useLibrary();
  const [theme, setTheme] = useState<Theme>('light');
  const [hevcPlays, setHevcPlays] = useState<boolean | null>(null);
  const s = data?.settings;

  useEffect(() => {
    try {
      setTheme((localStorage.getItem('theme') as Theme) || 'light');
    } catch {}
    setHevcPlays(document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '');
  }, []);

  const save = (patch: Partial<Settings>) => engine.setSettings(patch);

  return (
    <>
      <ScreenHeader title="Settings" />

      {s && (
        <>
          <section className="card stack">
            <h2 className="section-label">How much to compress</h2>
            <div className="option-cards" role="radiogroup">
              {(Object.keys(PRESETS) as Preset[]).map((p) => (
                <Option
                  key={p}
                  value={p}
                  current={s.preset}
                  onPick={(preset) => void save({ preset })}
                  title={PRESETS[p].label}
                  tag={PRESETS[p].tag}
                  figures={[
                    { value: `−${PRESETS[p].storagePct}%`, label: 'STORAGE', tone: 'primary' },
                    { value: `−${PRESETS[p].qualityDrop}%`, label: 'QUALITY', tone: 'tertiary' },
                  ]}
                />
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="section-label">Photos</h2>
            <div className="option-cards" role="radiogroup">
              {(Object.keys(PHOTO_FORMATS) as PhotoFormat[]).map((f) => (
                <Option
                  key={f}
                  value={f}
                  current={s.photoFormat}
                  onPick={(photoFormat) => void save({ photoFormat })}
                  title={PHOTO_FORMATS[f].label}
                  tag={f === 'jpeg' ? 'Stays JPEG · can replace' : 'Becomes HEIC · new file'}
                  desc={f === 'jpeg' ? 'JPEG → JPEG' : 'JPEG → HEIC (AVIF on the web)'}
                  figures={[{ value: `−${Math.round(PHOTO_FORMATS[f].typicalSaving * 100)}%`, label: 'STORAGE', tone: 'primary' }]}
                />
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="section-label">Videos</h2>
            <div className="option-cards" role="radiogroup">
              <Option<VideoCodec>
                value="hevc"
                current={s.videoCodec}
                onPick={(videoCodec) => void save({ videoCodec })}
                title="HEVC (H.265)"
                tag="Smaller files · recommended"
                desc="MP4 → MP4 · MOV → MOV, converted to HEVC"
                figures={[{ value: '1×', label: 'SIZE', tone: 'primary' }]}
              />
              <Option<VideoCodec>
                value="h264"
                current={s.videoCodec}
                onPick={(videoCodec) => void save({ videoCodec })}
                title="H.264 (AVC)"
                tag="Plays on every device"
                desc="MP4 → MP4 · MOV → MOV, converted to H.264"
                figures={[{ value: '1.4×', label: 'SIZE', tone: 'primary' }]}
              />
            </div>
            {hevcPlays === false && s.videoCodec === 'hevc' && (
              <div className="banner warn">This browser may not play the smaller videos. Pick &ldquo;Plays everywhere&rdquo; if the preview stays blank.</div>
            )}
          </section>
        </>
      )}

      <section className="card stack">
        <h2 className="section-label">Appearance</h2>
        <Segmented<Theme>
          value={theme}
          onChange={(t) => {
            setTheme(t);
            applyTheme(t);
          }}
          options={[
            { value: 'dark', label: <><Icon name="moon" size={14} /> Dark</> },
            { value: 'light', label: <><Icon name="sun" size={14} /> Light</> },
            { value: 'system', label: 'System' },
          ]}
        />
      </section>

      <section className="card stack">
        <h2 className="section-label">Library</h2>
        <div className="row-between">
          <span className="muted">Your original photos and videos are not touched.</span>
          <button
            className="btn"
            onClick={async () => {
              if (await askConfirm({ title: 'Clear the library?', body: 'Compressed copies not yet used to replace an original are deleted. Files on your device are not touched.', ok: 'Clear', danger: true })) void engine.clear();
            }}
          >
            <Icon name="trash" size={16} /> Clear library
          </button>
        </div>
      </section>

      <DeviceCard />
      <NotificationsCard />
    </>
  );
}
