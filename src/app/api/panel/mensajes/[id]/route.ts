import { NextResponse } from 'next/server';
import { EstadoContacto } from '@prisma/client';

import { AuthError } from '@/lib/auth';
import { requirePanelTenant } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';

const ESTADOS: EstadoContacto[] = [
  EstadoContacto.NUEVO,
  EstadoContacto.LEIDO,
  EstadoContacto.RESPONDIDO,
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { propertyWhere } = await requirePanelTenant();

    const { id } = await params;
    const body = (await request.json()) as { estado?: unknown };

    if (
      typeof body.estado !== 'string' ||
      !(ESTADOS as readonly string[]).includes(body.estado)
    ) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const estado = body.estado as EstadoContacto;

    const contacto = await prisma.contacto.findFirst({
      where: { id, propiedad: { is: propertyWhere } },
      select: {
        id: true,
        propiedad: {
          select: { id: true, inmobiliariaId: true, agenteId: true },
        },
      },
    });

    if (!contacto) {
      return NextResponse.json({ error: 'Consulta no encontrada.' }, { status: 404 });
    }

    await prisma.contacto.update({
      where: { id: contacto.id },
      data: { estado },
    });

    return NextResponse.json({ ok: true, estado }, { status: 200 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[PATCH /api/panel/mensajes/[id]]', e);
    return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
  }
}
