'use client';

import { canEncodeVideo } from 'mediabunny';
import { useEffect, useState } from 'react';
import { canOpenFolder } from '@/engine/folder';
import { disableNotifications, enableNotifications, notify, notifyStatus, type NotifyStatus } from '@/engine/notify';
import { formatSize } from '@/lib/format';
import { useDevice } from './device';
import Icon from './Icon';

interface Caps {
  hevc: boolean;
  h264: boolean;
  folder: boolean;
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
      setCaps({ hevc, h264, folder: canOpenFolder(), used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted });
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
      <p className="muted" style={{ fontSize: 14 }}>
        Compressly works entirely on the {dev.phone ? 'phone' : 'device'} you open it on. Photos and videos are never uploaded; compressed copies
        are kept in this browser&apos;s storage until you save them or clear the library.
      </p>
      {!caps ? (
        <span className="muted">Checking…</span>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {yes(caps.hevc, 'Can make HEVC video (what the app uses)', caps.h264 ? "Can't make HEVC here, so videos use H.264 (a bit bigger)" : "This browser can't encode video. Try Chrome, Edge or Safari")}
          {yes(caps.folder, 'Can open folders and replace originals in them', dev.phone ? 'Pick files from the gallery; originals are replaced by the app, not the website' : 'Folders not supported in this browser; use Chrome or Edge to replace originals')}
          <span className="muted" style={{ fontSize: 14 }}>
            Using {formatSize(caps.used)} of this browser&apos;s storage{caps.quota ? ` (up to ${formatSize(caps.quota)} available)` : ''}.
            {!caps.persisted && ' The browser may clear it if the device runs low on space.'}
          </span>
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
      <p className="muted" style={{ fontSize: 14 }}>
        A quiet update as each file finishes (&ldquo;3 of 8 done · about 12 min left&rdquo;) and an alert when everything is done, while you use
        other tabs or apps.
        {dev.phone && ' Keep Compressly open: phones pause web pages that are closed or behind a locked screen.'}
      </p>
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
            <Icon name="info" size={18} /> Turn on notifications
          </button>
        </div>
      )}
      {status === 'denied' && (
        <div className="banner warn">Notifications are blocked for this site. Allow them in the browser&apos;s site settings, then reload.</div>
      )}
      {status === 'unsupported' && (
        <div className="banner warn">
          This browser can&apos;t show notifications from websites.{dev.ios && ' On iPhone, add Compressly to the Home Screen first (Share → Add to Home Screen) and open it from there.'}
        </div>
      )}
      {status === 'insecure' && <div className="banner warn">Notifications need the site to be opened over https (or on localhost).</div>}
    </section>
  );
}
