import { Prisma } from '@prisma/client';

import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { prisma } from '@/lib/prisma';
import type { PanelTenantAuthorizationContext } from '@/lib/panel-authorization';
import type { Currency } from '@/types/money';

export const ANALYTICS_PERIOD_DAYS = 30;
export const CONVERSION_MINIMUM_VIEWS = 10;
const MAX_ZONAS_EN_GRAFICO = 5;

export type ChartNameValueDatum = { name: string; value: number };
export type FunnelDatum = ChartNameValueDatum;
export type PrecioM2ZonaDatum = { name: string; value: string };

export type AnalyticsMetric = {
  value: string | null;
  status: 'measured' | 'insufficient_data' | 'unavailable';
  period: { from: string; to: string };
};

export type PanelAnalyticsStats = {
  totalPropiedades: number;
  totalConsultas: number;
  visitasTotales: number;
  conversion: AnalyticsMetric;
};

export type TopPropiedadItem = {
  id: string;
  titulo: string;
  visitas: number;
  imagen: string;
};

export type PrecioM2PorZonaResult = {
  zonas: PrecioM2ZonaDatum[];
  promedioGeneral: string;
  moneda: Currency;
};

export type PanelAnalyticsData = {
  stats: PanelAnalyticsStats;
  funnel: FunnelDatum[];
  topPropiedades: TopPropiedadItem[];
  precioM2PorMoneda: PrecioM2PorZonaResult[];
  period: { from: string; to: string };
};

export type VentaZonaAggregateRow = {
  barrio: string | null;
  moneda: Currency;
  totalPrecio: Prisma.Decimal | string;
  totalM2: number;
};

function normalizeZonaLabel(barrio: string | null): string {
  return barrio?.trim() || 'Sin zona';
}

function ratioText(amount: Prisma.Decimal, m2: number): string {
  return amount.div(new Prisma.Decimal(m2.toString())).toDecimalPlaces(2).toFixed(2);
}

/** Calcula Σ precio / Σ m² por zona, siempre dentro de un grupo de moneda. */
export function buildPrecioM2PorMoneda(
  rows: VentaZonaAggregateRow[],
): PrecioM2PorZonaResult[] {
  const currencies: Currency[] = ['ARS', 'USD'];
  return currencies.flatMap((currency) => {
    const currencyRows = rows.filter(
      (row) => row.moneda === currency && row.totalM2 > 0 && new Prisma.Decimal(row.totalPrecio).gt(0),
    );
    if (currencyRows.length === 0) return [];

    let totalPrecio = new Prisma.Decimal(0);
    let totalM2 = 0;
    const zones = currencyRows.map((row) => {
      const amount = new Prisma.Decimal(row.totalPrecio);
      totalPrecio = totalPrecio.plus(amount);
      totalM2 += row.totalM2;
      return {
        name: normalizeZonaLabel(row.barrio),
        value: ratioText(amount, row.totalM2),
        amount,
        m2: row.totalM2,
      };
    });
    zones.sort((left, right) => new Prisma.Decimal(right.value).comparedTo(left.value));

    const visible = zones.slice(0, MAX_ZONAS_EN_GRAFICO);
    const remaining = zones.slice(MAX_ZONAS_EN_GRAFICO);
    if (remaining.length > 0) {
      const otherAmount = remaining.reduce(
        (sum, zone) => sum.plus(zone.amount),
        new Prisma.Decimal(0),
      );
      const otherM2 = remaining.reduce((sum, zone) => sum + zone.m2, 0);
      visible.push({
        name: 'Otros',
        value: ratioText(otherAmount, otherM2),
        amount: otherAmount,
        m2: otherM2,
      });
    }

    return [{
      moneda: currency,
      zonas: visible.map(({ name, value }) => ({ name, value })),
      promedioGeneral: ratioText(totalPrecio, totalM2),
    }];
  });
}

export function buildConversionMetric(input: {
  contacts: number;
  views: number;
  from: Date;
  to: Date;
}): AnalyticsMetric {
  const period = { from: input.from.toISOString(), to: input.to.toISOString() };
  if (input.views === 0) return { value: null, status: 'unavailable', period };
  if (input.views < CONVERSION_MINIMUM_VIEWS) {
    return { value: null, status: 'insufficient_data', period };
  }
  const value = new Prisma.Decimal(input.contacts)
    .div(input.views)
    .times(100)
    .toDecimalPlaces(2)
    .toFixed(2);
  return { value, status: 'measured', period };
}

/** Métricas medidas del tenant o de la cartera asignada al agente durante los últimos 30 días. */
export async function getPanelAnalytics(
  context: PanelTenantAuthorizationContext,
): Promise<PanelAnalyticsData> {
  const to = new Date();
  const from = new Date(to.getTime() - ANALYTICS_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const period = { from: from.toISOString(), to: to.toISOString() };
  const wherePropiedad = context.propertyWhere;
  const eventScope = {
    createdAt: { gte: from, lt: to },
    propiedad: { is: wherePropiedad },
  };

  const [totalPropiedades, visitasTotales, totalConsultas, topGroups, ventaGroups] =
    await Promise.all([
      prisma.propiedad.count({ where: wherePropiedad }),
      prisma.propiedadVista.count({ where: eventScope }),
      prisma.contacto.count({
        where: {
          createdAt: { gte: from, lt: to },
          origen: 'PUBLICO',
          propiedad: { is: wherePropiedad },
        },
      }),
      prisma.propiedadVista.groupBy({
        by: ['propiedadId'],
        where: eventScope,
        _count: { _all: true },
        orderBy: { _count: { propiedadId: 'desc' } },
        take: 4,
      }),
      prisma.propiedad.groupBy({
        by: ['barrio', 'moneda'],
        where: {
          ...wherePropiedad,
          operacion: { equals: 'VENTA', mode: 'insensitive' },
        },
        _sum: { precio: true, m2Total: true },
      }),
    ]);

  const topRows = topGroups.length === 0
    ? []
    : await prisma.propiedad.findMany({
        where: { ...wherePropiedad, id: { in: topGroups.map((row) => row.propiedadId) } },
        select: { id: true, titulo: true, imagenes: true },
      });
  const topById = new Map(topRows.map((row) => [row.id, row]));
  const topPropiedades = topGroups.flatMap((group) => {
    const row = topById.get(group.propiedadId);
    if (!row) return [];
    const urls = imagenesItemsToUrls(normalizePropiedadImagenesDb(row.imagenes));
    return [{
      id: row.id,
      titulo: row.titulo,
      visitas: group._count._all,
      imagen: urls[0] ?? '',
    }];
  });

  const precioM2PorMoneda = buildPrecioM2PorMoneda(
    ventaGroups.flatMap((row) =>
      row._sum.precio && row._sum.m2Total
        ? [{
            barrio: row.barrio,
            moneda: row.moneda,
            totalPrecio: row._sum.precio,
            totalM2: row._sum.m2Total,
          }]
        : [],
    ),
  );

  return {
    stats: {
      totalPropiedades,
      totalConsultas,
      visitasTotales,
      conversion: buildConversionMetric({ contacts: totalConsultas, views: visitasTotales, from, to }),
    },
    funnel: [
      { name: 'Visualizaciones', value: visitasTotales },
      { name: 'Consultas', value: totalConsultas },
    ],
    topPropiedades,
    precioM2PorMoneda,
    period,
  };
}
