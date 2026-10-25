// Keeps a compressed copy on the original's date, so a replaced file stays where it was in the gallery
// (galleries sort by the date inside the file: a video's recording time, a photo's EXIF "date taken").
// Runs in the engine worker.

/** Seconds between 1904-01-01 (MP4 clock) and 1970-01-01 (Unix clock). */
const MP4_EPOCH = 2082844800;

// ---------- Video (MP4 / MOV) ----------

/** Top-level boxes: [offset, size, type]. Reads only the 16-byte headers, so it is quick even for huge files. */
async function topBoxes(file: Blob): Promise<[number, number, string][]> {
  const out: [number, number, string][] = [];
  let at = 0;
  while (at + 8 <= file.size && out.length < 1000) {
    const h = new DataView(await file.slice(at, at + 16).arrayBuffer());
    let size = h.getUint32(0);
    const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
    if (size === 1) size = Number(h.getBigUint64(8));
    else if (size === 0) size = file.size - at;
    if (size < 8) break;
    out.push([at, size, type]);
    at += size;
  }
  return out;
}

/** mvhd / tkhd / mdhd boxes inside a moov, as offsets within it. */
function timeBoxes(moov: Uint8Array): number[] {
  const v = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
  const found: number[] = [];
  const walk = (start: number, end: number) => {
    let at = start;
    while (at + 8 <= end) {
      const size = v.getUint32(at);
      const type = String.fromCharCode(moov[at + 4], moov[at + 5], moov[at + 6], moov[at + 7]);
      if (size < 8 || at + size > end) return;
      if (type === 'trak' || type === 'mdia') walk(at + 8, at + size);
      else if (type === 'mvhd' || type === 'tkhd' || type === 'mdhd') found.push(at);
      at += size;
    }
  };
  walk(8, moov.byteLength);
  return found;
}

/** The original video's recording time in MP4 seconds (since 1904), or null if it has none. */
export async function videoCreationTime(file: Blob): Promise<number | null> {
  const moov = (await topBoxes(file)).find(([, , t]) => t === 'moov');
  if (!moov || moov[1] > 64e6) return null;
  const bytes = new Uint8Array(await file.slice(moov[0], moov[0] + moov[1]).arrayBuffer());
  const mvhd = timeBoxes(bytes).find((at) => String.fromCharCode(...bytes.subarray(at + 4, at + 8)) === 'mvhd');
  if (mvhd === undefined) return null;
  const v = new DataView(bytes.buffer);
  const t = bytes[mvhd + 8] === 1 ? Number(v.getBigUint64(mvhd + 12)) : v.getUint32(mvhd + 12);
  // Some cameras leave 0; anything before 1990 is not a real recording date.
  return t > 86 * 365 * 86400 ? t : null;
}

/** MP4 seconds for a file's "last changed" time, the fallback when a video carries no date of its own. */
export const mp4Time = (unixMs: number) => Math.floor(unixMs / 1000) + MP4_EPOCH;

/** Writes `time` as the creation and modification time of every mvhd / tkhd / mdhd in the output video. */
export async function setVideoTime(io: { size: number; read(at: number, len: number): Uint8Array; write(data: Uint8Array, at: number): void }, time: number) {
  // Find moov among the top-level boxes of the output, then patch it in place (same length).
  let at = 0;
  while (at + 8 <= io.size) {
    const h = io.read(at, 16);
    const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
    let size = v.getUint32(0);
    const type = String.fromCharCode(h[4], h[5], h[6], h[7]);
    if (size === 1) size = Number(v.getBigUint64(8));
    else if (size === 0) size = io.size - at;
    if (size < 8) return;
    if (type === 'moov') {
      const moov = io.read(at, size);
      const mv = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
      for (const b of timeBoxes(moov)) {
        if (moov[b + 8] === 1) {
          mv.setBigUint64(b + 12, BigInt(time));
          mv.setBigUint64(b + 20, BigInt(time));
        } else if (time < 2 ** 32) {
          mv.setUint32(b + 12, time);
          mv.setUint32(b + 16, time);
        }
      }
      io.write(moov, at);
      return;
    }
    at += size;
  }
}

// ---------- Photos (JPEG) ----------

/** The JPEG's EXIF segment (APP1 "Exif"), whole, or null. */
function exifSegment(jpeg: Uint8Array): Uint8Array | null {
  let i = 2;
  while (i + 4 < jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marker === 0xe1 && jpeg[i + 4] === 0x45 && jpeg[i + 5] === 0x78 && jpeg[i + 6] === 0x69 && jpeg[i + 7] === 0x66) return jpeg.slice(i, i + 2 + len);
    if (marker === 0xda) break;
    i += 2 + len;
  }
  return null;
}

/** Sets the EXIF orientation to 1: the compressed pixels are already turned upright. */
function uprightExif(seg: Uint8Array) {
  const t = 10; // TIFF header inside the segment
  const le = seg[t] === 0x49;
  const v = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const ifd = t + v.getUint32(t + 4, le);
  if (ifd + 2 > seg.length) return;
  for (let k = 0, n = v.getUint16(ifd, le); k < n; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > seg.length) return;
    if (v.getUint16(e, le) === 0x0112) v.setUint16(e + 8, 1, le);
  }
}

/** A minimal EXIF segment holding only the date taken ("YYYY:MM:DD HH:MM:SS", local time). */
function dateOnlyExif(ms: number): Uint8Array {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}\0`;
  // TIFF (big-endian): IFD0 { DateTime, ExifIFD pointer } → Exif IFD { DateTimeOriginal, DateTimeDigitized }.
  const tiff = new Uint8Array(8 + 2 + 2 * 12 + 4 + 20 + 2 + 2 * 12 + 4 + 20);
  const v = new DataView(tiff.buffer);
  tiff.set([0x4d, 0x4d, 0, 42, 0, 0, 0, 8]);
  const ifd0 = 8;
  const date0 = ifd0 + 2 + 24 + 4;
  const exif = date0 + 20;
  const date1 = exif + 2 + 24 + 4;
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    v.setUint16(at, tag);
    v.setUint16(at + 2, type);
    v.setUint32(at + 4, count);
    v.setUint32(at + 8, value);
  };
  v.setUint16(ifd0, 2);
  entry(ifd0 + 2, 0x0132, 2, 20, date0);
  entry(ifd0 + 14, 0x8769, 4, 1, exif);
  v.setUint16(exif, 2);
  entry(exif + 2, 0x9003, 2, 20, date1);
  entry(exif + 14, 0x9004, 2, 20, date1);
  for (let i = 0; i < 20; i++) tiff[date0 + i] = tiff[date1 + i] = stamp.charCodeAt(i);
  const seg = new Uint8Array(4 + 6 + tiff.length);
  seg.set([0xff, 0xe1, (seg.length - 2) >> 8, (seg.length - 2) & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  seg.set(tiff, 10);
  return seg;
}

/**
 * The compressed JPEG with the original's camera details (date taken, place, camera) put back, turned upright.
 * If the original had none, the file's own date is written as the date taken so the gallery keeps it in place.
 */
export function withPhotoDate(original: Uint8Array, compressed: Uint8Array, lastModified: number): Uint8Array {
  let seg = exifSegment(original);
  if (seg && seg.length > 18) uprightExif(seg);
  else seg = dateOnlyExif(lastModified);
  // Drop the encoder's JFIF header: EXIF must come straight after the start marker.
  let rest = 2;
  if (compressed[2] === 0xff && compressed[3] === 0xe0) rest = 4 + ((compressed[4] << 8) | compressed[5]);
  const out = new Uint8Array(2 + seg.length + compressed.length - rest);
  out.set([0xff, 0xd8]);
  out.set(seg, 2);
  out.set(compressed.subarray(rest), 2 + seg.length);
  return out;
}
