import { RolUsuario } from '@prisma/client';

import type { CurrentUser } from '@/types/auth';

import { buildPropiedadEngagement } from '@/lib/panel-seguimiento';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { prisma } from '@/lib/prisma';
import { decimalToMoneyText, divideMoney } from '@/lib/money';
import { buildConversionMetric } from '@/lib/panel-analytics';

export type PropiedadInformeTotalConsulta = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string;
  estado: string;
  visitasFisicas: number;
  createdAt: string;
};

export type PropiedadInformeTotalVisita = {
  id: string;
  fecha: string;
  visitanteNombre: string;
  visitanteEmail: string;
  visitanteTelefono: string | null;
  registradoPorNombre: string;
};

export type PropiedadInformeTotalData = {
  propiedad: {
    id: string;
    titulo: string;
    tipo: string;
    operacion: string;
    estado: string;
    precio: string;
    moneda: 'ARS' | 'USD';
    expensas: string | null;
    direccion: string;
    barrio: string | null;
    m2Total: number;
    m2Cubiertos: number;
    ambientes: number;
    dormitorios: number;
    banos: number;
    cocheras: number;
    caracteristicas: string[];
    visitas: number;
    consultas: number;
    esExclusiva: boolean;
    createdAt: string;
    inmobiliariaNombre: string;
    agenteNombre: string;
    agenteTelefono: string;
    agenteEmail: string | null;
    imagenPrincipal: string | null;
    imagenesCount: number;
    latitud: number;
    longitud: number;
  };
  favoritosCount: number;
  consultasNuevas: number;
  consultasRespondidas: number;
  visitasFisicasTotal: number;
  diasEnMercado: number;
  valorM2: string;
  convRatePct: string | null;
  engagement: ReturnType<typeof buildPropiedadEngagement>;
  consultas: PropiedadInformeTotalConsulta[];
  visitasPresenciales: PropiedadInformeTotalVisita[];
};

export async function getPropiedadInformeTotalData(
  propiedadId: string,
  user: CurrentUser,
): Promise<PropiedadInformeTotalData | null> {
  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);
  if (!tenantInmobiliariaId) return null;

  const where: { id: string; inmobiliariaId: string; agenteId?: string } = {
    id: propiedadId,
    inmobiliariaId: tenantInmobiliariaId,
  };
  if (user.rol === RolUsuario.AGENTE) {
    where.agenteId = user.id;
  }

  const prop = await prisma.propiedad.findFirst({
    where,
    select: {
      id: true,
      titulo: true,
      tipo: true,
      operacion: true,
      estado: true,
      precio: true,
      moneda: true,
      expensas: true,
      direccion: true,
      barrio: true,
      latitud: true,
      longitud: true,
      m2Total: true,
      m2Cubiertos: true,
      ambientes: true,
      dormitorios: true,
      banos: true,
      cocheras: true,
      caracteristicas: true,
      imagenes: true,
      visitas: true,
      consultas: true,
      esExclusiva: true,
      createdAt: true,
      inmobiliaria: { select: { nombreAgencia: true } },
      agente: { select: { nombre: true, telefono: true, email: true } },
      _count: { select: { favoritadosPor: true } },
      contactos: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          mensaje: true,
          estado: true,
          visitasFisicas: true,
          createdAt: true,
        },
      },
      visitasFisicasEventos: {
        where: { delta: 1 },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          contacto: {
            select: { nombre: true, email: true, telefono: true },
          },
          registradoPor: { select: { nombre: true } },
        },
      },
    },
  });

  if (!prop) return null;

  const visitasFisicasTotal = prop.contactos.reduce((sum, c) => sum + c.visitasFisicas, 0);
  const conversionTo = new Date();
  const conversionFrom = new Date(conversionTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [periodViews, periodContacts] = await Promise.all([
    prisma.propiedadVista.count({
      where: { propiedadId: prop.id, createdAt: { gte: conversionFrom, lt: conversionTo } },
    }),
    prisma.contacto.count({
      where: {
        propiedadId: prop.id,
        origen: 'PUBLICO',
        createdAt: { gte: conversionFrom, lt: conversionTo },
      },
    }),
  ]);
  const diasEnMercado = Math.max(
    0,
    Math.floor((Date.now() - prop.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const convRatePct = buildConversionMetric({
    contacts: periodContacts,
    views: periodViews,
    from: conversionFrom,
    to: conversionTo,
  }).value;
  const valorM2 =
    prop.m2Total > 0
      ? `${prop.moneda} ${divideMoney(prop.precio, prop.m2Total)}`
      : '—';
  const imagenes = imagenesItemsToUrls(normalizePropiedadImagenesDb(prop.imagenes));
  const consultasNuevas = prop.contactos.filter((c) => c.estado === 'NUEVO').length;
  const consultasRespondidas = prop.contactos.filter((c) => c.estado === 'RESPONDIDO').length;

  return {
    propiedad: {
      id: prop.id,
      titulo: prop.titulo,
      tipo: prop.tipo,
      operacion: prop.operacion,
      estado: prop.estado,
      precio: decimalToMoneyText(prop.precio),
      moneda: prop.moneda,
      expensas: prop.expensas ? decimalToMoneyText(prop.expensas) : null,
      direccion: prop.direccion,
      barrio: prop.barrio,
      m2Total: prop.m2Total,
      m2Cubiertos: prop.m2Cubiertos,
      ambientes: prop.ambientes,
      dormitorios: prop.dormitorios,
      banos: prop.banos,
      cocheras: prop.cocheras,
      caracteristicas: prop.caracteristicas,
      visitas: prop.visitas,
      consultas: prop.consultas,
      esExclusiva: prop.esExclusiva,
      createdAt: prop.createdAt.toISOString(),
      inmobiliariaNombre: prop.inmobiliaria.nombreAgencia,
      agenteNombre: prop.agente?.nombre ?? user.nombre,
      agenteTelefono: prop.agente?.telefono ?? user.telefono ?? '—',
      agenteEmail: prop.agente?.email ?? null,
      imagenPrincipal: imagenes[0] ?? null,
      imagenesCount: imagenes.length,
      latitud: prop.latitud,
      longitud: prop.longitud,
    },
    favoritosCount: prop._count.favoritadosPor,
    consultasNuevas,
    consultasRespondidas,
    visitasFisicasTotal,
    diasEnMercado,
    valorM2,
    convRatePct,
    engagement: buildPropiedadEngagement(
      prop.visitas,
      prop.consultas,
      0,
      visitasFisicasTotal,
    ),
    consultas: prop.contactos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      mensaje: c.mensaje,
      estado: c.estado,
      visitasFisicas: c.visitasFisicas,
      createdAt: c.createdAt.toISOString(),
    })),
    visitasPresenciales: prop.visitasFisicasEventos.map((ev) => ({
      id: ev.id,
      fecha: ev.createdAt.toISOString(),
      visitanteNombre: ev.contacto.nombre,
      visitanteEmail: ev.contacto.email,
      visitanteTelefono: ev.contacto.telefono,
      registradoPorNombre: ev.registradoPor.nombre,
    })),
  };
}

export function formatInformeContacto(telefono: string | null, email: string): string {
  const tel = telefono?.trim();
  if (tel) return tel;
  if (email.endsWith('@panel.propea')) return 'Sin teléfono';
  return email;
}

export function labelEstadoContacto(estado: string): string {
  switch (estado) {
    case 'NUEVO':
      return 'Nuevo';
    case 'LEIDO':
      return 'Leído';
    case 'RESPONDIDO':
      return 'Respondido';
    default:
      return estado;
  }
}

export function labelEstadoPropiedad(estado: string): string {
  switch (estado) {
    case 'DISPONIBLE':
      return 'Disponible';
    case 'RESERVADA':
      return 'Reservada';
    case 'VENDIDA':
      return 'Vendida';
    case 'PAUSADA':
      return 'Pausada';
    default:
      return estado;
  }
}
