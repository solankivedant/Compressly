// Compressed copies live in the browser's private storage on this device (the Origin Private File System).
// It survives reloads and isn't visible in the gallery; "Save" or "Replace" puts a copy where the user wants it.

const DIR = 'compressed';

async function dir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create: true });
}

export const outputName = (id: string, ext: string) => `${id}.${ext}`;

/** Main thread: read a compressed copy back as a File. */
export async function readOutput(id: string, ext: string): Promise<File | null> {
  try {
    return await (await (await dir()).getFileHandle(outputName(id, ext))).getFile();
  } catch {
    return null;
  }
}

export async function removeOutput(id: string, ext?: string) {
  const d = await dir();
  if (ext) return d.removeEntry(outputName(id, ext)).catch(() => {});
  for await (const name of (d as unknown as { keys(): AsyncIterable<string> }).keys()) {
    if (name.startsWith(`${id}.`)) await d.removeEntry(name).catch(() => {});
  }
}

export async function clearOutputs() {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(DIR, { recursive: true }).catch(() => {});
}

/**
 * Worker only: a writable stream into a new compressed file. Uses the synchronous access handle,
 * which every current browser supports inside workers (including Safari on iPhone).
 */
export async function openOutputWriter(id: string, ext: string) {
  const handle = await (await dir()).getFileHandle(outputName(id, ext), { create: true });
  const sync = await (handle as unknown as { createSyncAccessHandle(): Promise<SyncHandle> }).createSyncAccessHandle();
  sync.truncate(0);
  let size = 0;
  const stream = new WritableStream<{ type: 'write'; data: Uint8Array; position: number }>({
    write(chunk) {
      sync.write(chunk.data, { at: chunk.position });
      size = Math.max(size, chunk.position + chunk.data.byteLength);
    },
  });
  return {
    stream,
    writeAll(data: Uint8Array) {
      sync.write(data, { at: 0 });
      size = data.byteLength;
    },
    close() {
      sync.flush();
      sync.close();
      return size;
    },
  };
}

interface SyncHandle {
  write(data: Uint8Array, opts: { at: number }): number;
  truncate(size: number): void;
  flush(): void;
  close(): void;
}
