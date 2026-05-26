import { EstadoPropiedad, RolUsuario } from '@prisma/client';

import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { prisma } from '@/lib/prisma';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import type { CurrentUser } from '@/types/auth';

export type ChartNameValueDatum = {
  name: string;
  value: number;
};

export type FunnelDatum = ChartNameValueDatum;
export type PrecioM2ZonaDatum = ChartNameValueDatum;

const MAX_ZONAS_EN_GRAFICO = 5;

export type PanelAnalyticsStats = {
  totalPropiedades: number;
  totalConsultas: number;
  visitasTotales: number;
};

export type TopPropiedadItem = {
  id: string;
  titulo: string;
  visitas: number;
  imagen: string;
};

export type PrecioM2PorZonaResult = {
  zonas: PrecioM2ZonaDatum[];
  promedioGeneral: number;
  moneda: string;
};

export type PanelAnalyticsData = {
  stats: PanelAnalyticsStats;
  funnel: FunnelDatum[];
  topPropiedades: TopPropiedadItem[];
  precioM2PorZona: PrecioM2PorZonaResult;
};

type VentaZonaRow = {
  barrio: string | null;
  precio: number;
  m2Total: number;
  moneda: string;
};

function buildPropiedadScope(user: CurrentUser, tenantInmobiliariaId: string) {
  const isAgente = user.rol === RolUsuario.AGENTE && Boolean(user.agenciaId);
  return {
    inmobiliariaId: tenantInmobiliariaId,
    ...(isAgente ? { agenteId: user.id } : {}),
  };
}

function normalizeZonaLabel(barrio: string | null): string {
  const trimmed = barrio?.trim();
  if (!trimmed) return 'Sin zona';
  return trimmed;
}

function collapseZonasMenores(
  sorted: PrecioM2ZonaDatum[],
  rowsByZona: Map<string, { precio: number; m2: number }>,
): PrecioM2ZonaDatum[] {
  if (sorted.length <= MAX_ZONAS_EN_GRAFICO) return sorted;

  const topNames = new Set(sorted.slice(0, MAX_ZONAS_EN_GRAFICO).map((z) => z.name));
  let otrosPrecio = 0;
  let otrosM2 = 0;

  for (const [name, agg] of rowsByZona.entries()) {
    if (topNames.has(name)) continue;
    otrosPrecio += agg.precio;
    otrosM2 += agg.m2;
  }

  const top = sorted.slice(0, MAX_ZONAS_EN_GRAFICO);
  if (otrosM2 > 0) {
    top.push({ name: 'Otros', value: Math.round(otrosPrecio / otrosM2) });
  }
  return top;
}

/**
 * Precio promedio por m² en venta por zona: Σ precio / Σ m² por barrio.
 * Solo operación VENTA (evita mezclar alquileres con ventas).
 */
export function buildPrecioM2PorZona(rows: VentaZonaRow[]): PrecioM2PorZonaResult {
  const ventaRows = rows.filter((r) => r.precio > 0 && r.m2Total > 0);

  if (ventaRows.length === 0) {
    return { zonas: [], promedioGeneral: 0, moneda: 'USD' };
  }

  const moneda = ventaRows[0]?.moneda ?? 'USD';
  const byZona = new Map<string, { precio: number; m2: number }>();
  let totalPrecio = 0;
  let totalM2 = 0;

  for (const row of ventaRows) {
    const label = normalizeZonaLabel(row.barrio);
    const current = byZona.get(label) ?? { precio: 0, m2: 0 };
    current.precio += row.precio;
    current.m2 += row.m2Total;
    byZona.set(label, current);
    totalPrecio += row.precio;
    totalM2 += row.m2Total;
  }

  const sorted = [...byZona.entries()]
    .map(([name, { precio, m2 }]) => ({
      name,
      value: Math.round(precio / m2),
    }))
    .sort((a, b) => b.value - a.value);

  const zonas = collapseZonasMenores(sorted, byZona);
  const promedioGeneral = totalM2 > 0 ? Math.round(totalPrecio / totalM2) : 0;

  return { zonas, promedioGeneral, moneda };
}

/** Métricas B2B del tenant (inmobiliaria completa o cartera del agente). */
export async function getPanelAnalytics(user: CurrentUser): Promise<PanelAnalyticsData | null> {
  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);
  if (!tenantInmobiliariaId) return null;

  const wherePropiedad = buildPropiedadScope(user, tenantInmobiliariaId);

  const [totalPropiedades, aggregates, totalConsultas, activas, topRows, ventaZonaRows] =
    await Promise.all([
      prisma.propiedad.count({ where: wherePropiedad }),
      prisma.propiedad.aggregate({
        where: wherePropiedad,
        _sum: { visitas: true, consultas: true },
      }),
      prisma.contacto.count({
        where: { propiedad: { is: wherePropiedad } },
      }),
      prisma.propiedad.count({
        where: { ...wherePropiedad, estado: EstadoPropiedad.DISPONIBLE },
      }),
      prisma.propiedad.findMany({
        where: wherePropiedad,
        orderBy: { visitas: 'desc' },
        take: 4,
        select: {
          id: true,
          titulo: true,
          visitas: true,
          imagenes: true,
        },
      }),
      prisma.propiedad.findMany({
        where: {
          ...wherePropiedad,
          operacion: { equals: 'VENTA', mode: 'insensitive' },
        },
        select: {
          barrio: true,
          precio: true,
          m2Total: true,
          moneda: true,
        },
      }),
    ]);

  const visitasTotales = aggregates._sum.visitas ?? 0;
  const consultasRegistradas = aggregates._sum.consultas ?? 0;

  const impresionesEstimadas = Math.round(
    Math.max(visitasTotales * 2.8, visitasTotales + activas * 30, totalPropiedades * 20, 1),
  );

  const consultasFunnel = Math.max(totalConsultas, consultasRegistradas);

  const topPropiedades: TopPropiedadItem[] = topRows.map((p) => {
    const urls = imagenesItemsToUrls(normalizePropiedadImagenesDb(p.imagenes));
    return {
      id: p.id,
      titulo: p.titulo,
      visitas: p.visitas,
      imagen: urls[0] ?? '',
    };
  });

  const precioM2PorZona = buildPrecioM2PorZona(ventaZonaRows);

  return {
    stats: {
      totalPropiedades,
      totalConsultas,
      visitasTotales,
    },
    funnel: [
      { name: 'Impresiones', value: impresionesEstimadas },
      { name: 'Visitas', value: visitasTotales },
      { name: 'Consultas', value: consultasFunnel },
    ],
    topPropiedades,
    precioM2PorZona,
  };
}
