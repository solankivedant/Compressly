'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { db } from '@/engine/db';
import { engine } from '@/engine/engine';
import { registerServiceWorker } from '@/engine/notify';
import type { LibraryResponse } from '@/lib/types';

/** Starts the on-device engine once for the whole site. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    void engine.load();
  }, []);
  return <>{children}</>;
}

/** The library on this device. `data` is null until it has loaded. */
export function useLibrary(): { data: LibraryResponse | null; error: string } {
  const data = useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => null);
  return { data, error: engine.loadError };
}

const thumbUrls = new Map<string, string>();

/** A thumbnail's address, read from this device's storage. */
export function useThumbUrl(id: string) {
  const [url, setUrl] = useState(() => thumbUrls.get(id) ?? '');
  useEffect(() => {
    if (thumbUrls.has(id)) return setUrl(thumbUrls.get(id)!);
    let live = true;
    void db.get<Blob>('thumbs', id).then((b) => {
      if (!b || !live) return;
      const u = URL.createObjectURL(b);
      thumbUrls.set(id, u);
      setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [id]);
  return url;
}

/** An address for a File loaded on demand (original or compressed copy); undefined while loading, '' if unavailable. */
export function useFileUrl(load: () => Promise<File | null>, key: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let made = '';
    setUrl(undefined);
    void load()
      .then((f) => {
        if (!live) return;
        made = f ? URL.createObjectURL(f) : '';
        setUrl(made);
      })
      .catch(() => live && setUrl(''));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}

/** Saves a File to the device: the share sheet where it can save to Photos (phones), else a normal download. */
export async function saveFile(file: File, name: string, preferShare: boolean): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const named = new File([file], name, { type: file.type });
  if (preferShare && window.isSecureContext && navigator.canShare?.({ files: [named] })) {
    try {
      await navigator.share({ files: [named] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const u = URL.createObjectURL(named);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 60_000);
  return 'downloaded';
}
