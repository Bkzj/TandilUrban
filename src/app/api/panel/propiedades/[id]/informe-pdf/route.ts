import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { AuthError } from '@/lib/auth';
import { renderInformePdfFromUrl } from '@/lib/panel-informe-pdf';
import type { InformePdfVariant } from '@/types/informe-pdf';
import { prisma } from '@/lib/prisma';
import { requirePropertyAccess } from '@/lib/panel-authorization';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseVariant(raw: string | null): InformePdfVariant {
  return raw === 'valoracion' ? 'valoracion' : 'total';
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const variant = parseVariant(new URL(request.url).searchParams.get('variant'));

  let propertyWhere: Prisma.PropiedadWhereInput;
  try {
    ({ propertyWhere } = await requirePropertyAccess(id));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const propiedad = await prisma.propiedad.findFirst({
    where: propertyWhere,
    select: { id: true, inmobiliariaId: true, agenteId: true },
  });

  if (!propiedad) {
    return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
  }

  try {
    const pdf = await renderInformePdfFromUrl(request, id, variant);
    const ref = id.slice(-8).toUpperCase();
    const filename =
      variant === 'total' ? `informe-integral-${ref}.pdf` : `informe-valoracion-${ref}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/panel/propiedades/[id]/informe-pdf]', error);
    return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 });
  }
}
