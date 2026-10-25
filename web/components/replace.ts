'use client';

import { engine } from '@/engine/engine';
import { canPickFiles, pickOne } from '@/engine/folder';
import { formatSize, savingPct } from '@/lib/format';
import type { MediaItem } from '@/lib/types';
import { deviceInfo } from './device';

const sameType = (a: string, b: string) => a.replace('jpeg', 'jpg') === b.replace('jpeg', 'jpg');

/**
 * "Replace in device": writes the compressed copy over the original where it is, so no second copy is kept.
 * If Compressly has no link to the original yet (added from the gallery, or before links existed), the user
 * picks the original once in the phone's file picker. Returns a message for the page; throws plain-language errors.
 */
export async function replaceOnDevice(item: MediaItem): Promise<string> {
  const r = item.result;
  if (!r) throw new Error('Compress the file first.');
  const id = item.id;

  if (!engine.hasLink(id)) {
    if (!canPickFiles()) {
      throw new Error(
        deviceInfo().ios ? "iPhone browsers can't change files on the phone. The Compressly app will do this." : "This browser can't change files on your device. Open Compressly in Chrome.",
      );
    }
    if (!sameType(item.ext, r.outputExt)) {
      throw new Error(`The compressed copy is ${r.outputExt.toUpperCase()}, so it can't overwrite this ${item.ext.toUpperCase()}. Remove it and compress it again with the same format.`);
    }
    const handle = await pickOne(item.kind);
    if (!handle) return '';
    await engine.attachOriginal(id, handle);
    // Picking used up this tap; if the browser still needs an OK to change the file, it can only ask on the next tap.
    if (!(await engine.allowWrite(id, false))) return `Found "${item.name}". Tap "Replace in device" once more to allow the change.`;
  } else if (!(await engine.allowWrite(id, true))) {
    throw new Error('Compressly needs your OK to change this file. Tap Replace again and choose Allow.');
  }

  if (!confirm(`Replace "${item.name}" on your device with the ${savingPct(item.originalBytes, r.outputBytes)}% smaller copy? This can't be undone.`)) return '';
  await engine.replaceInFolder(id);
  return `Replaced on your device · ${formatSize(item.originalBytes - r.outputBytes)} freed.`;
}
