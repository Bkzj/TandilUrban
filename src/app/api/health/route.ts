import { healthReport } from '@/lib/operational-health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(): Response {
  return Response.json(healthReport(), {
    headers: { 'cache-control': 'no-store' },
  });
}
