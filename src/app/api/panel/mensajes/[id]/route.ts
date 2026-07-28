import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { requirePanelTenant } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { identifierSchema } from '@/lib/validation/common';
import { contactStatusSchema } from '@/lib/validation/contact';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteHandler(request, 'panel.contact_status.failed', async () => {
    const context = await requirePanelTenant();
    const parsedId = identifierSchema.safeParse((await params).id);
    if (!parsedId.success) throw new ApiError('NOT_FOUND', { message: 'Consulta no encontrada.' });
    const { estado } = await parseJsonBody(
      request,
      contactStatusSchema,
      REQUEST_LIMITS.authJsonBytes,
    );
    const contact = await prisma.contacto.findFirst({
      where: { id: parsedId.data, propiedad: { is: context.propertyWhere } },
      select: { id: true },
    });
    if (!contact) throw new ApiError('NOT_FOUND', { message: 'Consulta no encontrada.' });
    await prisma.contacto.update({ where: { id: contact.id }, data: { estado } });
    return NextResponse.json({ ok: true, estado });
  });
}
