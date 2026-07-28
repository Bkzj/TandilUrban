import { NextResponse } from 'next/server';

import {
  getPublicRecentProperties,
  MAX_RECENT_PROPERTIES,
} from '@/lib/public-recent-properties';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('ids' in body)) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const ids = (body as { ids?: unknown }).ids;
  if (
    !Array.isArray(ids) ||
    ids.length > MAX_RECENT_PROPERTIES ||
    !ids.every((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 64)
  ) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const propiedades = await getPublicRecentProperties(ids);
  return NextResponse.json({ propiedades });
}
