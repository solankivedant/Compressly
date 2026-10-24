'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LibraryResponse } from '@/lib/types';

interface LibraryCtx {
  data: LibraryResponse | null;
  error: string;
  refresh: () => Promise<void>;
}

const Ctx = createContext<LibraryCtx>({ data: null, error: '', refresh: async () => {} });

/** One poll for the whole site: fast while something is compressing, slow otherwise. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/items', { cache: 'no-store' });
      if (!r.ok) throw new Error(`Server answered ${r.status}`);
      setData(await r.json());
      setError('');
    } catch (e) {
      setError(`Can't reach the local server. ${(e as Error).message}`);
    }
  }, []);

  const busy = (data?.summary.activeCount ?? 0) > 0;
  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, busy ? 700 : 3000);
    return () => clearInterval(t);
  }, [refresh, busy]);

  return <Ctx.Provider value={{ data, error, refresh }}>{children}</Ctx.Provider>;
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
