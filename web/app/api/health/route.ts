import sharp from 'sharp';
import { DATA_DIR, HOSTED } from '@/server/store';
import { FFMPEG, run } from '@/server/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tool check shown on the Settings page. */
export async function GET() {
  if (HOSTED) return Response.json({ hosted: true, ffmpeg: { ok: false }, sharp: sharp.versions, dataDir: '', node: process.version });
  let ffmpeg: { ok: boolean; version?: string; hevc?: boolean; error?: string };
  try {
    const v = await run(FFMPEG, ['-hide_banner', '-version']);
    const enc = await run(FFMPEG, ['-hide_banner', '-encoders']);
    ffmpeg = { ok: v.code === 0, version: v.stdout.split('\n')[0]?.replace('ffmpeg version ', '').split(' ')[0], hevc: enc.stdout.includes('libx265') };
  } catch (e) {
    ffmpeg = { ok: false, error: (e as Error).message };
  }
  return Response.json({ ffmpeg, sharp: sharp.versions, dataDir: DATA_DIR, node: process.version, platform: process.platform });
}
