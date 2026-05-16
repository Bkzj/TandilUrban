import { NextResponse } from 'next/server';
import { EstadoContacto } from '@prisma/client';

import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tenés que iniciar sesión.' }, { status: 401 });
    }

    try {
      assertNotPublicPortalUser(user);
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }

    const { id } = await params;
    const body = (await request.json()) as { estado?: unknown };

    if (
      typeof body.estado !== 'string' ||
      !(ESTADOS as readonly string[]).includes(body.estado)
    ) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const estado = body.estado as EstadoContacto;

    const contacto = await prisma.contacto.findUnique({
      where: { id },
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

    if (!userCanModifyPropiedad(user, contacto.propiedad)) {
      return NextResponse.json({ error: 'No tenés permiso para actualizar esta consulta.' }, { status: 403 });
    }

    await prisma.contacto.update({
      where: { id: contacto.id },
      data: { estado },
    });

    return NextResponse.json({ ok: true, estado }, { status: 200 });
  } catch (e) {
    console.error('[PATCH /api/panel/mensajes/[id]]', e);
    return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
  }
}
