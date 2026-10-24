'use client';

import { useEffect, useState } from 'react';
import { useDevice } from './device';
import Icon from './Icon';
import { disablePush, enablePush, pushStatus, testPush, type PushStatus } from './push';

/** Settings → "Open on your phone": this computer's Wi-Fi address as a QR code. */
export function OpenOnPhoneCard() {
  const [urls, setUrls] = useState<{ url: string; qr: string }[] | null>(null);
  const dev = useDevice();

  useEffect(() => {
    void fetch('/api/lan')
      .then((r) => r.json())
      .then((d) => setUrls(d.urls))
      .catch(() => setUrls([]));
  }, []);

  if (dev.phone) {
    return (
      <section className="card stack">
        <h2 className="section-label">Phone</h2>
        <p className="row-between" style={{ justifyContent: 'flex-start', gap: 8 }}>
          <span className="chip good">
            <Icon name="check" size={14} /> Open on your phone
          </span>
          <span className="muted" style={{ fontSize: 14 }}>
            Compressing runs on your computer, so it keeps going while your phone is locked or this page is closed.
          </span>
        </p>
        {!dev.standalone && (
          <p className="muted" style={{ fontSize: 14 }}>
            Tip: use your browser&apos;s menu → <strong>{dev.ios ? 'Share → Add to Home Screen' : 'Add to Home screen'}</strong> to open Compressly
            like an app.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card stack">
      <h2 className="section-label">Open on your phone</h2>
      {urls === null ? (
        <span className="muted">Finding this computer&apos;s address…</span>
      ) : urls.length === 0 ? (
        <p className="muted">This computer isn&apos;t on a Wi-Fi or wired network right now.</p>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 14 }}>
            Put your phone on the same Wi-Fi, then scan the code with its camera. If it doesn&apos;t open, stop the site and start it with{' '}
            <code>npm run phone</code> instead of <code>npm run dev</code>, and allow Node.js through the Windows firewall when asked (Private
            networks).
          </p>
          <div className="qr-list">
            {urls.map((u) => (
              <figure key={u.url} className="qr">
                <span dangerouslySetInnerHTML={{ __html: u.qr }} />
                <figcaption className="tabular">{u.url}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** Settings → "Notifications": progress and "all done" messages, even with the page closed. */
export function NotificationsCard() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dev = useDevice();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(location.origin);
    void pushStatus().then(setStatus).catch(() => setStatus('unsupported'));
  }, []);

  const run = async (fn: () => Promise<PushStatus | void>) => {
    setBusy(true);
    setError('');
    try {
      const s = await fn();
      if (s) setStatus(s);
    } catch (e) {
      setError((e as Error).message || 'Could not change notifications.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <h2 className="section-label">Notifications</h2>
      <p className="muted" style={{ fontSize: 14 }}>
        Get a quiet update as each file finishes (&ldquo;3 of 8 done · about 12 min left&rdquo;) and an alert when everything is done.
      </p>

      {status === null && <span className="muted">Checking…</span>}

      {status === 'on' && (
        <div className="row-between">
          <span className="chip good">
            <Icon name="check" size={14} /> On for this {dev.phone ? 'phone' : 'browser'}
          </span>
          <span className="row-between" style={{ gap: 8 }}>
            <button className="btn small" disabled={busy} onClick={() => void run(testPush)}>
              Send a test
            </button>
            <button className="btn ghost small" disabled={busy} onClick={() => void run(disablePush)}>
              Turn off
            </button>
          </span>
        </div>
      )}

      {status === 'off' && (
        <div>
          <button className="btn primary" disabled={busy} onClick={() => void run(enablePush)}>
            <Icon name="info" size={18} /> Turn on notifications
          </button>
        </div>
      )}

      {status === 'denied' && (
        <div className="banner warn">
          Notifications are blocked for this site. Allow them in the browser&apos;s site settings (tap the icon left of the address), then reload
          this page.
        </div>
      )}

      {status === 'unsupported' && <div className="banner warn">This browser can&apos;t show notifications from websites. Try Chrome.</div>}

      {status === 'insecure' &&
        (dev.ios ? (
          <div className="banner info">
            iPhones only allow website notifications from a secure (https) address added to the Home Screen, and the local test site can&apos;t
            have one. Compressing still carries on while your phone is locked; open this page again to see where it got to. The Compressly app
            will notify you on iPhone.
          </div>
        ) : (
          <div className="banner info stack" style={{ gap: 8 }}>
            <span>
              Browsers only allow notifications on secure addresses, and this local one ({origin}) isn&apos;t one. On Android Chrome you can allow
              it for testing:
            </span>
            <ol className="steps">
              <li>
                Open a new tab and go to <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
              </li>
              <li>
                Set it to <strong>Enabled</strong> and type <code>{origin}</code> in the box.
              </li>
              <li>
                Tap <strong>Relaunch</strong>, come back to this page and tap Turn on notifications.
              </li>
            </ol>
            <span>On the computer itself, open the site as http://localhost:3000 and notifications work directly.</span>
          </div>
        ))}

      {error && <div className="banner warn">{error}</div>}
    </section>
  );
}
