import { NextResponse } from 'next/server';

import { getPublicRecentProperties } from '@/lib/public-recent-properties';
import { runRouteHandler } from '@/lib/route-handler';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { recentPropertiesSchema } from '@/lib/validation/upload';

export async function POST(request: Request) {
  return runRouteHandler(request, 'public.recent_properties.failed', async () => {
    const { ids } = await parseJsonBody(
      request,
      recentPropertiesSchema,
      REQUEST_LIMITS.contactJsonBytes,
    );
    const propiedades = await getPublicRecentProperties(ids);
    return NextResponse.json({ propiedades });
  });
}
