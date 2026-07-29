import { readinessReport } from '@/lib/operational-health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const report = await readinessReport();
  return Response.json(report, {
    status: report.status === 'ready' ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}
