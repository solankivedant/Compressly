'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light' | 'system';

// One theme for the whole site, shared by the header toggle and Settings so they never disagree.
const listeners = new Set<() => void>();

function stored(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || 'light';
  } catch {
    return 'light';
  }
}

export function resolveTheme(t: Theme): 'dark' | 'light' {
  return t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
}

export function applyTheme(t: Theme) {
  try {
    localStorage.setItem('theme', t);
  } catch {}
  document.documentElement.dataset.theme = resolveTheme(t);
  listeners.forEach((l) => l());
}

/** The chosen theme ('system' included); 'light' until the browser has read it. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    stored,
    () => 'light',
  );
}
