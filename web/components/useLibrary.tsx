'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LibraryResponse } from '@/lib/types';
import { registerServiceWorker } from './push';

interface LibraryCtx {
  data: LibraryResponse | null;
  error: string;
  /** The site is deployed on a hosting service instead of running on a computer. */
  hosted: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<LibraryCtx>({ data: null, error: '', hosted: false, refresh: async () => {} });

/** One poll for the whole site: fast while something is compressing, slow otherwise. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [error, setError] = useState('');
  const [hosted, setHosted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/items', { cache: 'no-store' });
      if (r.status === 503 && (await r.clone().json().catch(() => ({}))).hosted) {
        setHosted(true);
        setError('');
        return;
      }
      if (!r.ok) throw new Error(`Server answered ${r.status}`);
      setData(await r.json());
      setError('');
    } catch (e) {
      setError(`Can't reach the Compressly server on your computer. Is it still running? (${(e as Error).message})`);
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
    // Phones pause pages in the background; catch up the moment the page is visible again.
    const onShow = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [refresh]);

  const busy = (data?.summary.activeCount ?? 0) > 0;
  useEffect(() => {
    if (hosted) return;
    void refresh();
    const t = setInterval(refresh, busy ? 1000 : 3000);
    return () => clearInterval(t);
  }, [refresh, busy, hosted]);

  return <Ctx.Provider value={{ data, error, hosted, refresh }}>{children}</Ctx.Provider>;
}

export const useLibrary = () => useContext(Ctx);

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${r.status})`);
  return body as T;
}
