'use server';

import { revalidatePath } from 'next/cache';

import {
  buildPropiedadEngagement,
  type PropiedadEngagementMetrics,
  type VisitaFisicaHistorialItem,
} from '@/lib/panel-seguimiento';
import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
import { prisma } from '@/lib/prisma';

export type AjustarVisitaFisicaResult =
  | {
      ok: true;
      visitasFisicas: number;
      visitasFisicasPropiedad: number;
      engagement: PropiedadEngagementMetrics;
      historialLead: VisitaFisicaHistorialItem[];
      historialPropiedad: VisitaFisicaHistorialItem[];
    }
  | { ok: false; error: string };

async function assertContactoAccess(contactoId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: 'Tenés que iniciar sesión.' };
  }

  try {
    assertNotPublicPortalUser(user);
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false as const, error: e.message };
    }
    throw e;
  }

  const id = contactoId?.trim();
  if (!id) {
    return { ok: false as const, error: 'Consulta inválida.' };
  }

  const contacto = await prisma.contacto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      visitasFisicas: true,
      propiedad: {
        select: {
          id: true,
          inmobiliariaId: true,
          agenteId: true,
          visitas: true,
          consultas: true,
        },
      },
    },
  });

  if (!contacto) {
    return { ok: false as const, error: 'Consulta no encontrada.' };
  }

  if (!userCanModifyPropiedad(user, contacto.propiedad)) {
    return { ok: false as const, error: 'No tenés permiso sobre esta consulta.' };
  }

  return { ok: true as const, user, contacto };
}

async function fetchHistorialLead(contactoId: string): Promise<VisitaFisicaHistorialItem[]> {
  const rows = await prisma.visitaFisicaEvento.findMany({
    where: { contactoId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      delta: true,
      createdAt: true,
      contacto: { select: { nombre: true } },
      registradoPor: { select: { nombre: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    createdAt: r.createdAt.toISOString(),
    visitanteNombre: r.contacto.nombre,
    registradoPorNombre: r.registradoPor.nombre,
  }));
}

async function fetchHistorialPropiedad(propiedadId: string): Promise<VisitaFisicaHistorialItem[]> {
  const rows = await prisma.visitaFisicaEvento.findMany({
    where: { propiedadId },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      id: true,
      delta: true,
      createdAt: true,
      contacto: { select: { nombre: true } },
      registradoPor: { select: { nombre: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    createdAt: r.createdAt.toISOString(),
    visitanteNombre: r.contacto.nombre,
    registradoPorNombre: r.registradoPor.nombre,
  }));
}

async function sumVisitasFisicasPropiedad(propiedadId: string): Promise<number> {
  const agg = await prisma.contacto.aggregate({
    where: { propiedadId },
    _sum: { visitasFisicas: true },
  });
  return agg._sum.visitasFisicas ?? 0;
}

async function buildSeguimientoPayload(
  contactoId: string,
  propiedadId: string,
  visitasWeb: number,
  consultas: number,
  visitasFisicasLead: number,
) {
  const visitasFisicasPropiedad = await sumVisitasFisicasPropiedad(propiedadId);
  const [historialLead, historialPropiedad] = await Promise.all([
    fetchHistorialLead(contactoId),
    fetchHistorialPropiedad(propiedadId),
  ]);

  return {
    visitasFisicas: visitasFisicasLead,
    visitasFisicasPropiedad,
    engagement: buildPropiedadEngagement(
      visitasWeb,
      consultas,
      visitasFisicasLead,
      visitasFisicasPropiedad,
    ),
    historialLead,
    historialPropiedad,
  };
}

export async function ajustarVisitaFisica(
  contactoId: string,
  delta: 1 | -1,
): Promise<AjustarVisitaFisicaResult> {
  const access = await assertContactoAccess(contactoId);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const { user, contacto } = access;

  if (delta === -1 && contacto.visitasFisicas <= 0) {
    return { ok: false, error: 'No hay visitas presenciales para restar en este lead.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.contacto.update({
      where: { id: contacto.id },
      data: { visitasFisicas: { increment: delta } },
      select: { visitasFisicas: true },
    });

    await tx.visitaFisicaEvento.create({
      data: {
        contactoId: contacto.id,
        propiedadId: contacto.propiedad.id,
        registradoPorId: user.id,
        delta,
      },
    });

    return next;
  });

  revalidatePath('/panel/mensajes');
  revalidatePath('/panel/propiedades');

  const payload = await buildSeguimientoPayload(
    contacto.id,
    contacto.propiedad.id,
    contacto.propiedad.visitas,
    contacto.propiedad.consultas,
    updated.visitasFisicas,
  );

  return { ok: true, ...payload };
}

/** @deprecated Usar ajustarVisitaFisica(contactoId, 1) */
export async function registrarVisitaFisica(contactoId: string) {
  return ajustarVisitaFisica(contactoId, 1);
}

export type SeguimientoLeadResult =
  | {
      ok: true;
      visitasFisicas: number;
      visitasFisicasPropiedad: number;
      engagement: PropiedadEngagementMetrics;
      historialLead: VisitaFisicaHistorialItem[];
      historialPropiedad: VisitaFisicaHistorialItem[];
    }
  | { ok: false; error: string };

export async function getSeguimientoLead(contactoId: string): Promise<SeguimientoLeadResult> {
  const access = await assertContactoAccess(contactoId);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const { contacto } = access;
  const payload = await buildSeguimientoPayload(
    contacto.id,
    contacto.propiedad.id,
    contacto.propiedad.visitas,
    contacto.propiedad.consultas,
    contacto.visitasFisicas,
  );

  return {
    ok: true,
    visitasFisicas: payload.visitasFisicas,
    visitasFisicasPropiedad: payload.visitasFisicasPropiedad,
    engagement: payload.engagement,
    historialLead: payload.historialLead,
    historialPropiedad: payload.historialPropiedad,
  };
}

export type SeguimientoPropiedadResult =
  | {
      ok: true;
      visitasFisicasPropiedad: number;
      engagement: PropiedadEngagementMetrics;
      historialPropiedad: VisitaFisicaHistorialItem[];
    }
  | { ok: false; error: string };

export async function getSeguimientoPropiedad(
  propiedadId: string,
): Promise<SeguimientoPropiedadResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Tenés que iniciar sesión.' };
  }

  try {
    assertNotPublicPortalUser(user);
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const prop = await prisma.propiedad.findUnique({
    where: { id: propiedadId },
    select: {
      id: true,
      inmobiliariaId: true,
      agenteId: true,
      visitas: true,
      consultas: true,
    },
  });

  if (!prop) {
    return { ok: false, error: 'Propiedad no encontrada.' };
  }

  if (!userCanModifyPropiedad(user, prop)) {
    return { ok: false, error: 'No tenés permiso sobre esta propiedad.' };
  }

  const visitasFisicasPropiedad = await sumVisitasFisicasPropiedad(prop.id);
  const historialPropiedad = await fetchHistorialPropiedad(prop.id);

  return {
    ok: true,
    visitasFisicasPropiedad,
    engagement: buildPropiedadEngagement(prop.visitas, prop.consultas, 0, visitasFisicasPropiedad),
    historialPropiedad,
  };
}
