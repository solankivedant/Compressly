import { PHOTO_FORMATS, PRESETS, CODECS } from '@/lib/rules';
import type { Settings } from '@/lib/types';
import { estimatePhotoBytes } from '@/server/photo';
import { store } from '@/server/store';
import { estimateVideoBytes } from '@/server/video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(store.settings());
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<Settings>;
  const patch: Partial<Settings> = {};
  if (body.preset && body.preset in PRESETS) patch.preset = body.preset;
  if (body.videoCodec && body.videoCodec in CODECS) patch.videoCodec = body.videoCodec;
  if (body.photoFormat && body.photoFormat in PHOTO_FORMATS) patch.photoFormat = body.photoFormat;
  const settings = store.setSettings(patch);

  // Estimates for files not yet compressed follow the new settings.
  for (const x of store.list()) {
    if (x.state !== 'new') continue;
    const estimateBytes =
      x.kind === 'video'
        ? estimateVideoBytes(
            {
              width: x.width,
              height: x.height,
              fps: x.fps ?? 30,
              durationSec: x.durationSec ?? 0,
              bitrateKbps: x.bitrateKbps ?? 0,
              sourceCodec: x.sourceCodec ?? '',
              hasAudio: !!x.hasAudio,
              audioKbps: x.audioKbps ?? 0,
            },
            settings,
            x.originalBytes,
          )
        : estimatePhotoBytes(x.originalBytes, settings);
    store.update(x.id, { estimateBytes });
  }
  return Response.json(settings);
}
