'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { DeviceCard, NotificationsCard } from '@/components/PhoneCards';
import { ScreenHeader } from '@/components/Shell';
import { Segmented } from '@/components/ui';
import { useLibrary } from '@/components/useLibrary';
import { engine } from '@/engine/engine';
import { CODECS, PHOTO_FORMATS, PRESETS } from '@/lib/rules';
import type { PhotoFormat, Preset, Settings, VideoCodec } from '@/lib/types';

type Theme = 'dark' | 'light' | 'system';

function applyTheme(t: Theme) {
  try {
    localStorage.setItem('theme', t);
  } catch {}
  const resolved = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = resolved;
}

function Option<T extends string>({ value, current, onPick, title, desc, tag }: { value: T; current: T; onPick: (v: T) => void; title: string; desc: string; tag?: string }) {
  return (
    <button type="button" role="radio" aria-checked={value === current} className={`option-card ${value === current ? 'on' : ''}`} onClick={() => onPick(value)}>
      <span className="radio" />
      <span className="grow">
        <span className="t">
          {title} {tag && <span className="chip small pro">{tag}</span>}
        </span>
        <span className="d">{desc}</span>
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { data } = useLibrary();
  const [theme, setTheme] = useState<Theme>('dark');
  const [hevcPlays, setHevcPlays] = useState<boolean | null>(null);
  const s = data?.settings;

  useEffect(() => {
    try {
      setTheme((localStorage.getItem('theme') as Theme) || 'dark');
    } catch {}
    setHevcPlays(document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '');
  }, []);

  const save = (patch: Partial<Settings>) => engine.setSettings(patch);

  return (
    <>
      <ScreenHeader title="Settings" />

      <DeviceCard />
      <NotificationsCard />

      {s && (
        <>
          <section className="card stack">
            <h2 className="section-label">Preset</h2>
            <div className="option-cards" role="radiogroup">
              {(Object.keys(PRESETS) as Preset[]).map((p) => (
                <Option
                  key={p}
                  value={p}
                  current={s.preset}
                  onPick={(preset) => void save({ preset })}
                  title={PRESETS[p].label}
                  desc={`${PRESETS[p].blurb}. Quality gate: SSIM ≥ ${PRESETS[p].minSsim}.`}
                  tag={PRESETS[p].pro ? 'Pro in app' : undefined}
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
                  title={`${PHOTO_FORMATS[f].label} · saves about ${Math.round(PHOTO_FORMATS[f].typicalSaving * 100)}%`}
                  desc={PHOTO_FORMATS[f].webNote}
                />
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="section-label">Advanced · video codec</h2>
            <Segmented<VideoCodec>
              value={s.videoCodec}
              onChange={(videoCodec) => void save({ videoCodec })}
              options={(Object.keys(CODECS) as VideoCodec[]).map((c) => ({ value: c, label: CODECS[c].label }))}
            />
            <p className="muted" style={{ fontSize: 14 }}>
              {CODECS[s.videoCodec].note}.
            </p>
            {hevcPlays === false && s.videoCodec === 'hevc' && (
              <div className="banner warn">
                This browser says it can&apos;t play HEVC, so the compare view may stay blank. Use Edge with the HEVC Video Extension, or switch to H.264
                for previewing.
              </div>
            )}
            {hevcPlays === true && <p className="chip good" style={{ justifySelf: 'start' }}><Icon name="check" size={14} /> This browser can play HEVC</p>}
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
          <span className="muted">Remove every file and compressed copy from Compressly on this device. Your original photos and videos are not touched.</span>
          <button
            className="btn"
            onClick={() => confirm('Clear the whole library on this device? Compressed copies you have not saved are deleted.') && void engine.clear()}
          >
            <Icon name="trash" size={16} /> Clear library
          </button>
        </div>
      </section>
    </>
  );
}
