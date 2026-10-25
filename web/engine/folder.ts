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

type FilePicker = (o?: { multiple?: boolean; id?: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle[]>;

/** Picking files with a link back to them, so the original can be replaced in place (Chrome on Android, Chrome / Edge on computers). */
export const canPickFiles = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window && window.isSecureContext;

export async function pickFiles(): Promise<{ file: File; link: OriginalLink; path: string }[] | null> {
  let handles: FileSystemFileHandle[];
  try {
    handles = await (window as unknown as { showOpenFilePicker: FilePicker }).showOpenFilePicker({
      multiple: true,
      id: 'compressly-files',
      types: [{ description: 'Photos and videos', accept: { 'image/*': [], 'video/*': [] } }],
    });
  } catch {
    return null; // cancelled
  }
  return linked(handles);
}

/** Files dropped on the page, with links where the browser gives them (Chrome / Edge). Null if it doesn't. */
export async function droppedFiles(dt: DataTransfer): Promise<{ file: File; link: OriginalLink; path: string }[] | null> {
  const items = Array.from(dt.items).filter((i) => i.kind === 'file');
  type WithHandle = DataTransferItem & { getAsFileSystemHandle?(): Promise<FileSystemHandle | null> };
  if (!items.length || !(items[0] as WithHandle).getAsFileSystemHandle) return null;
  const handles = await Promise.all(items.map((i) => (i as WithHandle).getAsFileSystemHandle!().catch(() => null)));
  if (handles.some((h) => !h || h.kind !== 'file')) return null;
  return linked(handles as FileSystemFileHandle[]);
}

async function linked(handles: FileSystemFileHandle[]) {
  const out: { file: File; link: OriginalLink; path: string }[] = [];
  for (const h of handles) {
    const file = await h.getFile();
    if (mediaKind(file)) out.push({ file, link: { file: h }, path: file.name });
  }
  return out;
}
