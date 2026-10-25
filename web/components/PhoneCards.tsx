'use client';

import { canEncodeVideo } from 'mediabunny';
import { useEffect, useState } from 'react';
import { canOpenFolder, canPickFiles } from '@/engine/folder';
import { disableNotifications, enableNotifications, notify, notifyStatus, type NotifyStatus } from '@/engine/notify';
import { formatSize } from '@/lib/format';
import { useDevice } from './device';
import Icon from './Icon';

interface Caps {
  hevc: boolean;
  h264: boolean;
  replace: boolean;
  used: number;
  quota: number;
  persisted: boolean;
}

/** Settings → "This device": what this browser can do, since everything runs here. */
export function DeviceCard() {
  const dev = useDevice();
  const [caps, setCaps] = useState<Caps | null>(null);

  useEffect(() => {
    void (async () => {
      const size = { width: 1920, height: 1080, bitrate: 8e6 };
      const [hevc, h264, est, persisted] = await Promise.all([
        canEncodeVideo('hevc', size).catch(() => false),
        canEncodeVideo('avc', size).catch(() => false),
        navigator.storage?.estimate?.().catch(() => null) ?? null,
        navigator.storage?.persisted?.().catch(() => false) ?? false,
      ]);
      setCaps({ hevc, h264, replace: canOpenFolder() || canPickFiles(), used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted });
    })();
  }, []);

  const yes = (ok: boolean, good: string, bad: string) => (
    <span className={`chip ${ok ? 'good' : 'warn'} wrap`}>
      <Icon name={ok ? 'check' : 'info'} size={14} /> {ok ? good : bad}
    </span>
  );

  return (
    <section className="card stack">
      <h2 className="section-label">This device</h2>
      {!caps ? (
        <span className="muted">Checking…</span>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {yes(caps.hevc || caps.h264, caps.hevc ? 'Can compress videos' : 'Can compress videos (slightly bigger files)', "Can't compress videos here. Try Chrome or Safari")}
          {yes(caps.replace, 'Can replace originals', dev.ios ? "Can't replace originals: download the copy instead" : "Can't replace originals here: use Chrome")}
          <span className="muted" style={{ fontSize: 14 }}>Using {formatSize(caps.used)} of storage</span>
        </div>
      )}
    </section>
  );
}

/** Settings → "Notifications": shown by this device while Compressly is open, also from a background tab. */
export function NotificationsCard() {
  const dev = useDevice();
  const [status, setStatus] = useState<NotifyStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setStatus(notifyStatus()), []);

  const turnOn = async () => {
    setBusy(true);
    setStatus(await enableNotifications().catch(() => 'unsupported' as const));
    setBusy(false);
  };

  return (
    <section className="card stack">
      <h2 className="section-label">Notifications</h2>
      <p className="muted" style={{ fontSize: 14 }}>Get told when compressing is done.</p>
      {status === 'on' && (
        <div className="row-between">
          <span className="chip good">
            <Icon name="check" size={14} /> On
          </span>
          <span className="row-between" style={{ gap: 8 }}>
            <button className="btn small" onClick={() => void notify({ title: 'Compressly', body: 'This is how updates will look.', tag: 'test', url: '/settings' }, true)}>
              Send a test
            </button>
            <button className="btn ghost small" onClick={() => setStatus(disableNotifications())}>
              Turn off
            </button>
          </span>
        </div>
      )}
      {status === 'off' && (
        <div>
          <button className="btn primary" disabled={busy} onClick={() => void turnOn()}>
            Turn on
          </button>
        </div>
      )}
      {status === 'denied' && (
        <div className="banner warn">Blocked. Allow notifications in the browser&apos;s site settings.</div>
      )}
      {status === 'unsupported' && (
        <div className="banner warn">
          Not available in this browser.{dev.ios && ' On iPhone, add Compressly to the Home Screen first.'}
        </div>
      )}
      {status === 'insecure' && <div className="banner warn">Open the https:// address to use notifications.</div>}
    </section>
  );
}
