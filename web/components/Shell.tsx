'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { DialogHost } from './Dialog';
import Icon, { type IconName } from './Icon';
import { PreviewHost } from './Preview';
import { applyTheme, resolveTheme, useTheme } from './theme';
import { useLibrary } from './useLibrary';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/compress', label: 'Compress', icon: 'compress' },
  { href: '/media', label: 'Media', icon: 'media' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

function isActive(path: string, href: string) {
  if (href === '/settings') return path.startsWith('/settings') || path === '/formats';
  return href === '/' ? path === '/' || path === '/history' || path === '/review' : path.startsWith(href);
}

/** Sidebar on wide screens, bottom nav (like the app) on phones. */
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data, error } = useLibrary();
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
          <Link href="/formats" className={`side-link ${path === '/formats' ? 'on' : ''}`}>
            <Icon name="info" />
            Format guide
          </Link>
        </nav>
        <p className="sidebar-foot">
          <Icon name="shield" size={16} /> Files stay on this device
        </p>
      </aside>

      <main className="content">
        {error && <div className="banner warn">{error}</div>}
        <InsecureNotice />
        {children}
      </main>

      <DialogHost />
      <PreviewHost />

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
      <GuideButton />
      <ThemeToggle />
    </header>
  );
}

/** Small ⓘ in the header that opens the Format guide (hidden on the guide itself). */
function GuideButton() {
  const path = usePathname();
  if (path === '/formats') return null;
  return (
    <Link href="/formats" className="icon-btn guide-btn" aria-label="Format guide" title="Format guide: which format to pick">
      <Icon name="info" size={20} />
    </Link>
  );
}

/** Small light / dark switch at the top of every screen. Settings still offers "System". */
function ThemeToggle() {
  const theme = useTheme();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(resolveTheme(theme) === 'dark'), [theme]);
  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={dark ? 'Switch to light' : 'Switch to dark'}
      onClick={() => applyTheme(dark ? 'light' : 'dark')}
    >
      <span className={dark ? '' : 'on'}>
        <Icon name="sun" size={20} />
      </span>
      <span className={dark ? 'on' : ''}>
        <Icon name="moon" size={20} />
      </span>
    </button>
  );
}


/** Browsers only allow on-device storage, background workers and notifications on https (or localhost). */
function InsecureNotice() {
  const [insecure, setInsecure] = useState(false);
  useEffect(() => setInsecure(!window.isSecureContext), []);
  if (!insecure) return null;
  return (
    <div className="banner warn">
      This address starts with <code>http://</code>, so the browser won&apos;t let Compressly store or compress files here. Open the site&apos;s{' '}
      <code>https://</code> address instead (for example your Vercel link).
    </div>
  );
}
