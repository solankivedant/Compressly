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
        </nav>
        <p className="sidebar-foot">
          <Icon name="shield" size={16} /> Files stay on this computer
        </p>
      </aside>

      <main className="content">
        {error && <div className="banner warn">{error}</div>}
        {children}
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
