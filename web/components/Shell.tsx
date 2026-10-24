'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import { useLibrary } from './useLibrary';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/compress', label: 'Compress', icon: 'compress' },
  { href: '/media', label: 'Media', icon: 'media' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' || path === '/history' || path === '/review' : path.startsWith(href);
}

/** Sidebar on wide screens, bottom nav (like the app) on phones. */
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data, error, hosted } = useLibrary();
  const active = data?.summary.activeCount ?? 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="compress" size={18} />
          </span>
          Compressly
          <span className="chip small">web</span>
        </Link>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`side-link ${isActive(path, n.href) ? 'on' : ''}`}>
              <Icon name={n.icon} />
              {n.label}
              {n.href === '/compress' && active > 0 && <span className="badge">{active}</span>}
            </Link>
          ))}
          <Link href="/history" className={`side-link ${path === '/history' ? 'on' : ''}`}>
            <Icon name="history" />
            History
          </Link>
        </nav>
        <p className="sidebar-foot">
          <Icon name="shield" size={16} /> Files stay on this computer
        </p>
      </aside>

      <main className="content">
        {error && <div className="banner warn">{error}</div>}
        {hosted ? <HostedNotice /> : children}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(path, n.href) ? 'on' : ''}>
            <span className="pill-icon">
              <Icon name={n.icon} />
              {n.href === '/compress' && active > 0 && <span className="dot" />}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function ScreenHeader({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: string; actions?: ReactNode }) {
  return (
    <header className="screen-header">
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back">
          <Icon name="back" />
        </Link>
      )}
      <div className="grow">
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        <h1>{title}</h1>
      </div>
      {actions}
    </header>
  );
}

/** Shown instead of the app when it was deployed to a hosting service (the "Server answered 500" problem). */
function HostedNotice() {
  return (
    <>
      <ScreenHeader title="Run Compressly on your computer" subtitle="This copy can't compress" />
      <section className="card stack">
        <p>
          This copy of the site is running on a hosting service (like Vercel), not on your computer. The web version of Compressly needs your
          computer: it uses <strong>FFmpeg</strong> to compress videos and keeps your files in a folder on your PC. Hosting services can do
          neither, which is why pages showed &ldquo;Server answered 500&rdquo; and FFmpeg showed as &ldquo;Not found&rdquo;.
        </p>
        <h2 className="section-label">To use it on your phone</h2>
        <ol className="steps">
          <li>
            On your computer, open a terminal in the <code>compressly/web</code> folder and run <code>npm run phone</code>.
          </li>
          <li>Keep your phone on the same Wi-Fi as the computer.</li>
          <li>
            Open the address it prints (it looks like <code>http://192.168.1.5:3000</code>) on your phone, or scan the QR code under Settings →
            Open on your phone.
          </li>
        </ol>
        <p className="muted" style={{ fontSize: 14 }}>
          Your photos and videos then go only to your own computer, never to the internet.
        </p>
      </section>
    </>
  );
}
