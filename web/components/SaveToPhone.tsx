'use client';

import { useState } from 'react';
import type { MediaItem } from '@/lib/types';
import Icon from './Icon';

/**
 * On a phone: puts the compressed copy into the phone's own storage. Where the browser allows it, this opens the
 * share sheet (iPhone: "Save Video / Save Image" goes straight to Photos); otherwise it downloads the file.
 * A website can't replace or delete anything in the gallery; that is the Compressly app's job.
 */
export default function SaveToPhone({ item }: { item: MediaItem }) {
  const [msg, setMsg] = useState('');
  const r = item.result!;
  const url = `/api/items/${item.id}/output?download`;
  const fileName = `${item.name.replace(/\.[^.]+$/, '')}-compressed.${r.outputExt}`;

  const save = async () => {
    setMsg('');
    try {
      if (window.isSecureContext && 'canShare' in navigator) {
        setMsg('Preparing…');
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], fileName, { type: r.outputMime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          setMsg('');
          return;
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return setMsg('');
    }
    // Fallback: a normal download (Android puts it in Downloads, which the gallery shows).
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setMsg('Downloading. It appears in your gallery under Downloads.');
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button className="btn primary block" onClick={() => void save()}>
        <Icon name="download" size={18} /> Save compressed copy to this phone
      </button>
      {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      <p className="muted" style={{ fontSize: 13 }}>
        A website can&apos;t replace or delete photos and videos in your gallery, so your original stays there until you delete it yourself.
        Replacing the original and deleting it in one step happens only in the Compressly app.
      </p>
    </div>
  );
}
