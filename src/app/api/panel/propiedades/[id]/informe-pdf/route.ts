import { NextResponse } from 'next/server';

import { getCurrentUser, roleCanAccessPanel } from '@/lib/auth';
import { renderInformePdfFromUrl } from '@/lib/panel-informe-pdf';
import type { InformePdfVariant } from '@/types/informe-pdf';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseVariant(raw: string | null): InformePdfVariant {
  return raw === 'valoracion' ? 'valoracion' : 'total';
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const variant = parseVariant(new URL(request.url).searchParams.get('variant'));

  const user = await getCurrentUser();
  if (!user || !roleCanAccessPanel(user.rol)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const propiedad = await prisma.propiedad.findUnique({
    where: { id },
    select: { id: true, inmobiliariaId: true, agenteId: true },
  });

  if (!propiedad || !userCanModifyPropiedad(user, propiedad)) {
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
    const message = error instanceof Error ? error.message : 'Error al generar el PDF.';
    console.error('[GET /api/panel/propiedades/[id]/informe-pdf]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
