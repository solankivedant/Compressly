import { getJob, publicJob } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const job = getJob((await params).id);
  if (!job) return Response.json({ error: 'Job not found (server restarted or older than 1 hour).' }, { status: 404 });
  return Response.json(publicJob(job));
}
