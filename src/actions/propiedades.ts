'use server';

import { revalidatePath } from 'next/cache';
import { EstadoPropiedad } from '@prisma/client';

import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Tenés que iniciar sesión.' };

  try {
    assertNotPublicPortalUser(user);
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const propiedad = await prisma.propiedad.findUnique({
    where: { id },
    select: { id: true, inmobiliariaId: true, agenteId: true, estado: true },
  });

  if (!propiedad) return { ok: false, error: 'Propiedad no encontrada.' };
  if (!userCanModifyPropiedad(user, propiedad)) {
    return { ok: false, error: 'No tenés permiso sobre esta propiedad.' };
  }

  const estadoAnterior = propiedad.estado;

  if (estadoAnterior === nuevoEstado) {
    return { ok: true, estado: nuevoEstado };
  }

  await prisma.propiedad.update({
    where: { id },
    data: { estado: nuevoEstado },
  });

  if (
    nuevoEstado === EstadoPropiedad.DISPONIBLE &&
    estadoAnterior !== EstadoPropiedad.DISPONIBLE
  ) {
    void import('@/lib/match-engine')
      .then((m) => m.onPropiedadPublicada(id))
      .catch(console.error);
  }

  revalidatePath('/panel/propiedades');

  return { ok: true, estado: nuevoEstado };
}
