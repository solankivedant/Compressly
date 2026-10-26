import fs from 'node:fs';
import { Readable } from 'node:stream';
import { getJob } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serves the original or the compressed file. Supports Range so <video> can seek.
export async function GET(req: Request, { params }: { params: Promise<{ id: string; which: string }> }) {
  const { id, which } = await params;
  const job = getJob(id);
  if (!job) return new Response('Not found', { status: 404 });

  const isOutput = which === 'output';
  const file = isOutput ? job.outputPath : which === 'original' ? job.inputPath : undefined;
  if (!file || (isOutput && job.status !== 'done')) return new Response('Not ready', { status: 404 });

  const size = (await fs.promises.stat(file)).size;
  const type = isOutput ? job.result!.outputMime : job.inputMime;
  const headers: Record<string, string> = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  if (new URL(req.url).searchParams.has('download')) {
    headers['Content-Disposition'] = `attachment; filename="compressed.${job.result?.outputExt ?? 'bin'}"`;
  }

  const range = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, 'Content-Length': String(size) } });
}
