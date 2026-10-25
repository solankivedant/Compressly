// The library is kept in this browser's IndexedDB on this device: the list of files, settings, measured speeds,
// thumbnails, and (where the browser allows) links back to the original files in their folders.

const NAME = 'compressly';
const STORES = ['kv', 'thumbs', 'handles'] as const;
type Store = (typeof STORES)[number];

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  return (opening ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => STORES.forEach((s) => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function req<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const r = fn(t.objectStore(store));
        t.oncomplete = () => resolve(r.result as T);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const db = {
  get: <T>(store: Store, key: string) => req<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: Store, key: string, value: unknown) => req<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key)),
  del: (store: Store, key: string) => req<undefined>(store, 'readwrite', (s) => s.delete(key)),
  clear: (store: Store) => req<undefined>(store, 'readwrite', (s) => s.clear()),
};

/**
 * A link to an original file, so the compressed copy can replace it: from a folder the user opened, or a single file
 * picked with the browser's file picker (Chrome and Edge on computers, Chrome on Android). `dir` is only there for folders.
 */
export interface OriginalLink {
  file: FileSystemFileHandle;
  dir?: FileSystemDirectoryHandle;
}
