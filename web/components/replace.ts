'use client';

import { engine } from '@/engine/engine';
import { canPickFiles, pickOne } from '@/engine/folder';
import { formatSize, savingPct } from '@/lib/format';
import type { MediaItem } from '@/lib/types';
import { askConfirm } from './Dialog';
import { deviceInfo } from './device';
import { saveFile } from './useLibrary';

const sameType = (a: string, b: string) => a.replace('jpeg', 'jpg') === b.replace('jpeg', 'jpg');

/**
 * "Replace in device": writes the compressed copy over the original where it is, so no second copy is kept.
 * Our Replace screen comes first; its button tap is then used for whatever the browser needs (finding the original
 * once, the browser's own Allow prompt), so the user isn't asked twice. Returns a message; throws plain-language errors.
 */
export async function replaceOnDevice(item: MediaItem): Promise<string> {
  const r = item.result;
  if (!r) throw new Error('Compress the file first.');
  const id = item.id;
  const linked = engine.hasLink(id);

  if (!linked) {
    if (!canPickFiles()) {
      throw new Error(
        deviceInfo().ios ? "iPhone browsers can't change files on the phone. Use Keep both to save the new copy." : "This browser can't change files on your device. Open Compressly in Chrome.",
      );
    }
    if (!sameType(item.ext, r.outputExt)) {
      throw new Error(`The compressed copy is ${r.outputExt.toUpperCase()}, so it can't overwrite this ${item.ext.toUpperCase()}. Use Keep both, or compress it again as JPEG.`);
    }
  }

  const ok = await askConfirm({
    title: `Replace the original ${item.kind === 'doc' ? 'file' : item.kind}?`,
    sizes: { before: formatSize(item.originalBytes), after: formatSize(r.outputBytes), saved: formatSize(item.originalBytes - r.outputBytes) },
    body: `"${item.name}" on your device becomes the ${savingPct(item.originalBytes, r.outputBytes)}% smaller copy. This can't be undone.${
      linked ? '' : ' Next, pick the same file so Compressly knows which one to change.'
    }`,
    ok: linked ? 'Replace' : 'Pick and replace',
  });
  if (!ok) return '';

  if (!linked) {
    const handle = await pickOne(item.kind);
    if (!handle) return '';
    await engine.attachOriginal(id, handle);
  }
  if (!(await engine.allowWrite(id, true))) {
    // Picking the file used up the tap, so the browser can only show its Allow prompt on the next one.
    const again = await askConfirm({
      title: 'Allow the change',
      body: 'Your browser asks once before Compressly can change this file. Choose "Allow" (or "Save changes") in its prompt.',
      ok: 'Allow and replace',
      icon: 'shield',
    });
    if (!again) return '';
    if (!(await engine.allowWrite(id, true))) throw new Error('The browser did not allow the change, so the original is untouched.');
  }
  await engine.replaceInFolder(id);
  return `Replaced on your device · ${formatSize(item.originalBytes - r.outputBytes)} freed.`;
}

/**
 * "Keep both": saves the compressed copy as a new file (share sheet on phones, Downloads on computers) and leaves
 * the original untouched. Returns a message for the page, or '' if the user cancelled.
 */
export async function downloadCopy(item: MediaItem): Promise<string> {
  const r = item.result;
  if (!r) throw new Error('Compress the file first.');
  const file = await engine.output(item.id);
  if (!file) throw new Error("The compressed copy isn't on this device any more. Compress the file again.");
  const base = item.name.replace(/\.[^.]+$/, '');
  const how = await saveFile(file, `${base}-compressed.${r.outputExt}`, deviceInfo().phone);
  if (how === 'cancelled') return '';
  engine.markKeptBoth(item.id);
  return `${how === 'shared' ? 'Shared' : 'Downloaded'} the ${formatSize(r.outputBytes)} copy · the original is kept too.`;
}
