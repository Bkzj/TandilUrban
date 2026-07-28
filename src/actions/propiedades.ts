'use server';

import { revalidatePath } from 'next/cache';
import { EstadoPropiedad } from '@prisma/client';

import { AuthError } from '@/lib/auth';
import { requirePropertyAccess } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { identifierSchema } from '@/lib/validation/common';
import {
  canTransitionPropertyState,
  propertyStateSchema,
} from '@/lib/validation/property-state';

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
    const parsedId = identifierSchema.safeParse(id);
    const parsedState = propertyStateSchema.safeParse(nuevoEstado);
    if (!parsedId.success || !parsedState.success) {
      return { ok: false, error: 'La propiedad o el estado son inválidos.' };
    }
    const { propertyWhere } = await requirePropertyAccess(parsedId.data);
    const propiedad = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, estado: true },
    });

    if (!propiedad) return { ok: false, error: 'Propiedad no encontrada.' };

    const estadoAnterior = propiedad.estado;

    if (!canTransitionPropertyState(estadoAnterior, parsedState.data)) {
      return { ok: false, error: `No se puede pasar de ${estadoAnterior} a ${parsedState.data}.` };
    }
    if (estadoAnterior === parsedState.data) {
      return { ok: true, estado: parsedState.data };
    }

    const update = await prisma.propiedad.updateMany({
      where: { id: propiedad.id, estado: estadoAnterior },
      data: { estado: parsedState.data },
    });
    if (update.count !== 1) return { ok: false, error: 'La propiedad cambió mientras se actualizaba.' };

    if (
      parsedState.data === EstadoPropiedad.DISPONIBLE &&
      estadoAnterior !== EstadoPropiedad.DISPONIBLE
    ) {
      void triggerMatchEngine(id).catch(console.error);
    }

    revalidatePath('/panel/propiedades', 'page');

    return { ok: true, estado: parsedState.data };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

}
