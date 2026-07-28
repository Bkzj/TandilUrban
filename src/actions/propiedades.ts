'use server';

import { revalidatePath } from 'next/cache';
import { EstadoPropiedad } from '@prisma/client';

import { AuthError } from '@/lib/auth';
import { requirePropertyAccess } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';

/**
 * Dispara el motor de match cuando una propiedad queda DISPONIBLE.
 * Import dinámico para no acoplar el bundle de server actions al motor de match.
 */
async function triggerMatchEngine(propiedadId: string): Promise<void> {
  const { onPropiedadPublicada } = await import('@/lib/match-engine');
  await onPropiedadPublicada(propiedadId);
}

export type CambiarEstadoPropiedadResult =
  | { ok: true; estado: EstadoPropiedad }
  | { ok: false; error: string };

export async function cambiarEstadoPropiedad(
  id: string,
  nuevoEstado: EstadoPropiedad,
): Promise<CambiarEstadoPropiedadResult> {
  try {
    const { propertyWhere } = await requirePropertyAccess(id);
    const propiedad = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, estado: true },
    });

    if (!propiedad) return { ok: false, error: 'Propiedad no encontrada.' };

    const estadoAnterior = propiedad.estado;

    if (estadoAnterior === nuevoEstado) {
      return { ok: true, estado: nuevoEstado };
    }

    await prisma.propiedad.update({
      where: { id: propiedad.id },
      data: { estado: nuevoEstado },
    });

    if (
      nuevoEstado === EstadoPropiedad.DISPONIBLE &&
      estadoAnterior !== EstadoPropiedad.DISPONIBLE
    ) {
      void triggerMatchEngine(id).catch(console.error);
    }

    revalidatePath('/panel/propiedades', 'page');

    return { ok: true, estado: nuevoEstado };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

}
