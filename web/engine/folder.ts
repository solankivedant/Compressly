'use client';

// "Open a folder": lists the photos and videos in a folder the user picks, keeping a link to each file so the
// compressed copy can later replace it. Only some browsers allow this (Chrome and Edge on computers today).

import type { OriginalLink } from './db';
import { mediaKind } from './engine';

type DirPicker = (o?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FileSystemDirectoryHandle>;

export const canOpenFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window && window.isSecureContext;

export async function pickFolder(): Promise<{ file: File; link: OriginalLink; path: string }[] | null> {
  let root: FileSystemDirectoryHandle;
  try {
    root = await (window as unknown as { showDirectoryPicker: DirPicker }).showDirectoryPicker({ mode: 'readwrite', id: 'compressly' });
  } catch {
    return null; // cancelled
  }
  const found: { file: File; link: OriginalLink; path: string }[] = [];
  async function walk(dir: FileSystemDirectoryHandle, prefix: string, depth: number) {
    for await (const entry of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
      if (entry.kind === 'directory') {
        if (depth < 3 && !entry.name.startsWith('.')) await walk(entry as FileSystemDirectoryHandle, `${prefix}${entry.name}/`, depth + 1);
      } else if (mediaKind({ name: entry.name })) {
        const fh = entry as FileSystemFileHandle;
        found.push({ file: await fh.getFile(), link: { file: fh, dir }, path: `${root.name}/${prefix}${entry.name}` });
      }
    }
  }
  await walk(root, '', 0);
  return found.sort((a, b) => b.file.lastModified - a.file.lastModified);
}
