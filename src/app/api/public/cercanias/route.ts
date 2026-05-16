import { NextResponse } from 'next/server';

import { getPOIsCercanos } from '@/lib/geo-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get('lat');
  const lngRaw = searchParams.get('lng');
  const radioRaw = searchParams.get('radio');

  if (latRaw === null || lngRaw === null || latRaw.trim() === '' || lngRaw.trim() === '') {
    return NextResponse.json(
      { error: 'Los parámetros lat y lng son obligatorios.' },
      { status: 400 }
    );
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'lat y lng deben ser números válidos.' },
      { status: 400 }
    );
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json(
      { error: 'Coordenadas fuera de rango.' },
      { status: 400 }
    );
  }

  const radioMetros = radioRaw !== null && radioRaw.trim() !== '' ? Number(radioRaw) : 1000;
  if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
    return NextResponse.json(
      { error: 'radio debe ser un número positivo (metros).' },
      { status: 400 }
    );
  }

  try {
    const cercanias = await getPOIsCercanos(lat, lng, radioMetros);
    return NextResponse.json({
      origen: { lat, lng },
      radioMetros,
      categorias: cercanias,
    });
  } catch (error) {
    console.error('[GET /api/public/cercanias]', error);
    const message =
      error instanceof Error ? error.message : 'No se pudieron cargar los puntos de interés.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
