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
import { panelPropertyScopeForUser } from '@/lib/panel-authorization';

export type AjustarVisitaFisicaResult =
  | {
      ok: true;
      visitasFisicas: number;
      visitasFisicasPropiedad: number;
      engagement: PropiedadEngagementMetrics;
      historialLead: VisitaFisicaHistorialItem[];
      historialPropiedad: VisitaFisicaHistorialItem[];
      eventoRegistrado?: { id: string; createdAt: string };
      contactoId?: string;
    }
  | { ok: false; error: string };

export type RegistrarVisitaManualPayload = {
  propiedadId: string;
  nombre: string;
  email?: string;
  telefono?: string;
};

export type PropiedadVisitaRegistroResult =
  | {
      ok: true;
      visitasFisicasPropiedad: number;
      visitasFisicasLead: number;
      evento: { id: string; createdAt: string };
      contacto: {
        id: string;
        nombre: string;
        email: string;
        telefono: string | null;
        visitasFisicas: number;
        createdAt: string;
      };
      consultaNueva: boolean;
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

  const propertyWhere = panelPropertyScopeForUser(user);
  const contacto = propertyWhere ? await prisma.contacto.findFirst({
    where: { id, propiedad: { is: propertyWhere } },
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
  }) : null;

  if (!contacto) {
    return { ok: false as const, error: 'Consulta no encontrada.' };
  }

  if (!userCanModifyPropiedad(user, contacto.propiedad)) {
    return { ok: false as const, error: 'No tenés permiso sobre esta consulta.' };
  }

  return { ok: true as const, user, contacto };
}

async function assertPropiedadAccess(propiedadId: string) {
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

  const id = propiedadId?.trim();
  if (!id) {
    return { ok: false as const, error: 'Propiedad inválida.' };
  }

  const propertyWhere = panelPropertyScopeForUser(user);
  const propiedad = propertyWhere ? await prisma.propiedad.findFirst({
    where: { AND: [{ id }, propertyWhere] },
    select: {
      id: true,
      inmobiliariaId: true,
      agenteId: true,
      visitas: true,
      consultas: true,
    },
  }) : null;

  if (!propiedad) {
    return { ok: false as const, error: 'Propiedad no encontrada.' };
  }

  if (!userCanModifyPropiedad(user, propiedad)) {
    return { ok: false as const, error: 'No tenés permiso sobre esta propiedad.' };
  }

  return { ok: true as const, user, propiedad };
}

function normalizeEmail(value?: string): string | null {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

function normalizeTelefono(value?: string): string | null {
  const telefono = value?.trim();
  return telefono ? telefono : null;
}

function emailRespaldoDesdeTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, '') || 'sin-numero';
  return `walkin.${digits}@panel.propea`;
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

    const evento = await tx.visitaFisicaEvento.create({
      data: {
        contactoId: contacto.id,
        propiedadId: contacto.propiedad.id,
        registradoPorId: user.id,
        delta,
      },
      select: { id: true, createdAt: true },
    });

    return { visitasFisicas: next.visitasFisicas, evento };
  });

  revalidatePath('/panel/mensajes', 'page');
  revalidatePath('/panel/propiedades', 'page');

  const payload = await buildSeguimientoPayload(
    contacto.id,
    contacto.propiedad.id,
    contacto.propiedad.visitas,
    contacto.propiedad.consultas,
    updated.visitasFisicas,
  );

  return {
    ok: true,
    ...payload,
    contactoId: contacto.id,
    eventoRegistrado:
      delta === 1
        ? {
            id: updated.evento.id,
            createdAt: updated.evento.createdAt.toISOString(),
          }
        : undefined,
  };
}

export async function eliminarVisitaFisicaEvento(
  eventoId: string,
): Promise<AjustarVisitaFisicaResult> {
  const id = eventoId?.trim();
  if (!id) {
    return { ok: false, error: 'Registro de visita inválido.' };
  }

  const evento = await prisma.visitaFisicaEvento.findUnique({
    where: { id },
    select: {
      id: true,
      delta: true,
      contactoId: true,
      contacto: {
        select: {
          id: true,
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
      },
    },
  });

  if (!evento) {
    return { ok: false, error: 'Registro de visita no encontrado.' };
  }

  const access = await assertContactoAccess(evento.contactoId);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  if (evento.delta !== 1) {
    return { ok: false, error: 'Solo se pueden eliminar visitas registradas.' };
  }

  if (evento.contacto.visitasFisicas <= 0) {
    return { ok: false, error: 'No hay visitas para eliminar en este lead.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.visitaFisicaEvento.delete({ where: { id: evento.id } });
    return tx.contacto.update({
      where: { id: evento.contactoId },
      data: { visitasFisicas: { decrement: 1 } },
      select: { visitasFisicas: true },
    });
  });

  revalidatePath('/panel/mensajes', 'page');
  revalidatePath('/panel/propiedades', 'page');

  const payload = await buildSeguimientoPayload(
    evento.contacto.id,
    evento.contacto.propiedad.id,
    evento.contacto.propiedad.visitas,
    evento.contacto.propiedad.consultas,
    updated.visitasFisicas,
  );

  return {
    ok: true,
    ...payload,
    contactoId: evento.contacto.id,
  };
}

export async function registrarVisitaFisicaManual(
  payload: RegistrarVisitaManualPayload,
): Promise<PropiedadVisitaRegistroResult> {
  const propiedadId = payload.propiedadId?.trim();
  const nombre = payload.nombre?.trim();
  const email = normalizeEmail(payload.email);
  const telefono = normalizeTelefono(payload.telefono);

  if (!nombre || nombre.length < 2) {
    return { ok: false, error: 'El nombre es obligatorio.' };
  }
  if (!email && !telefono) {
    return { ok: false, error: 'Ingresá un teléfono o un email.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El email no tiene un formato válido.' };
  }
  if (telefono && telefono.length < 6) {
    return { ok: false, error: 'El teléfono debe tener al menos 6 caracteres.' };
  }

  const access = await assertPropiedadAccess(propiedadId ?? '');
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const { user, propiedad } = access;

  const orFilters = [
    email ? { email } : null,
    telefono ? { telefono } : null,
  ].filter((item): item is { email: string } | { telefono: string } => item !== null);

  const existing =
    orFilters.length > 0
      ? await prisma.contacto.findFirst({
          where: {
            propiedadId: propiedad.id,
            OR: orFilters,
          },
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            visitasFisicas: true,
            createdAt: true,
          },
        })
      : null;

  const result = await prisma.$transaction(async (tx) => {
    let contactoRow: {
      id: string;
      nombre: string;
      email: string;
      telefono: string | null;
      visitasFisicas: number;
      createdAt: Date;
    };
    let consultaNueva = false;

    if (existing) {
      contactoRow = await tx.contacto.update({
        where: { id: existing.id },
        data: { visitasFisicas: { increment: 1 } },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          visitasFisicas: true,
          createdAt: true,
        },
      });
    } else {
      consultaNueva = true;
      contactoRow = await tx.contacto.create({
        data: {
          nombre,
          email: email ?? emailRespaldoDesdeTelefono(telefono!),
          telefono,
          mensaje: 'Visita presencial registrada manualmente desde el panel.',
          propiedadId: propiedad.id,
          visitasFisicas: 1,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          visitasFisicas: true,
          createdAt: true,
        },
      });
    }

    const evento = await tx.visitaFisicaEvento.create({
      data: {
        contactoId: contactoRow.id,
        propiedadId: propiedad.id,
        registradoPorId: user.id,
        delta: 1,
      },
      select: { id: true, createdAt: true },
    });

    return { contactoRow, evento, consultaNueva };
  });

  revalidatePath('/panel/mensajes', 'page');
  revalidatePath('/panel/propiedades', 'page');

  const visitasFisicasPropiedad = await sumVisitasFisicasPropiedad(propiedad.id);

  return {
    ok: true,
    visitasFisicasPropiedad,
    visitasFisicasLead: result.contactoRow.visitasFisicas,
    evento: {
      id: result.evento.id,
      createdAt: result.evento.createdAt.toISOString(),
    },
    contacto: {
      id: result.contactoRow.id,
      nombre: result.contactoRow.nombre,
      email: result.contactoRow.email,
      telefono: result.contactoRow.telefono,
      visitasFisicas: result.contactoRow.visitasFisicas,
      createdAt: result.contactoRow.createdAt.toISOString(),
    },
    consultaNueva: result.consultaNueva,
  };
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

  const propertyWhere = panelPropertyScopeForUser(user);
  const prop = propertyWhere ? await prisma.propiedad.findFirst({
    where: { AND: [{ id: propiedadId }, propertyWhere] },
    select: {
      id: true,
      inmobiliariaId: true,
      agenteId: true,
      visitas: true,
      consultas: true,
    },
  }) : null;

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
