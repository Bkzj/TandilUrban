import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { requirePropertyAccess } from '@/lib/panel-authorization';
import { renderInformePdfFromUrl } from '@/lib/panel-informe-pdf';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { reportVariantQuerySchema } from '@/lib/validation/analytics';
import { identifierSchema } from '@/lib/validation/common';
import { parseSearchParams } from '@/lib/validation/request';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return runRouteHandler(request, 'panel.property_pdf.failed', async () => {
    const parsedId = identifierSchema.safeParse((await context.params).id);
    if (!parsedId.success) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });
    const query = parseSearchParams(
      new URL(request.url).searchParams,
      reportVariantQuerySchema,
    );
    const { propertyWhere } = await requirePropertyAccess(parsedId.data);
    const property = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true },
    });
    if (!property) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });

    const pdf = await renderInformePdfFromUrl(request, property.id, query.variant);
    const ref = property.id.slice(-8).toUpperCase();
    const filename = query.variant === 'total'
      ? `informe-integral-${ref}.pdf`
      : `informe-valoracion-${ref}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
