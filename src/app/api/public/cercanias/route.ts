import { NextResponse } from 'next/server';

import { getPOIsCercanos } from '@/lib/geo-utils';
import { runRouteHandler } from '@/lib/route-handler';
import { nearbySearchSchema } from '@/lib/validation/pagination';
import { parseSearchParams } from '@/lib/validation/request';

export async function GET(request: Request) {
  return runRouteHandler(request, 'public.nearby.failed', async () => {
    const query = parseSearchParams(new URL(request.url).searchParams, nearbySearchSchema);
    const cercanias = await getPOIsCercanos(query.lat, query.lng, query.radio);
    return NextResponse.json({
      origen: { lat: query.lat, lng: query.lng },
      radioMetros: query.radio,
      categorias: cercanias,
    });
  });
}
