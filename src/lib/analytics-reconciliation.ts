import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type AnalyticsReconciliationReport = {
  mode: 'dry-run' | 'apply';
  propertyViewMismatches: number;
  propertyContactMismatches: number;
  physicalVisitMismatches: number;
  impossibleNegativeEventTotals: number;
};

type CountRow = { count: bigint };

function countOf(rows: CountRow[]): number {
  return Number(rows[0]?.count ?? BigInt(0));
}

export async function reconcileAnalyticsCounters(
  apply = false,
): Promise<AnalyticsReconciliationReport> {
  return prisma.$transaction(async (tx) => {
    const [views, contacts, physical, negatives] = await Promise.all([
      tx.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT count(*)::bigint AS count
        FROM "Propiedad" p
        WHERE p."visitas" <> (
          SELECT count(*)::integer FROM "PropiedadVista" v WHERE v."propiedadId" = p.id
        )
      `),
      tx.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT count(*)::bigint AS count
        FROM "Propiedad" p
        WHERE p."consultas" <> (
          SELECT count(*)::integer FROM "Contacto" c WHERE c."propiedadId" = p.id
        )
      `),
      tx.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT count(*)::bigint AS count
        FROM "Contacto" c
        WHERE c."visitasFisicas" <> COALESCE((
          SELECT sum(e.delta)::integer FROM "VisitaFisicaEvento" e WHERE e."contactoId" = c.id
        ), 0)
      `),
      tx.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT count(*)::bigint AS count
        FROM (
          SELECT e."contactoId"
          FROM "VisitaFisicaEvento" e
          GROUP BY e."contactoId"
          HAVING sum(e.delta) < 0
        ) invalid
      `),
    ]);

    const impossibleNegativeEventTotals = countOf(negatives);
    if (apply && impossibleNegativeEventTotals > 0) {
      throw new Error('No se puede aplicar: existen historiales de visitas físicas con total negativo.');
    }

    if (apply) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Propiedad" p
        SET "visitas" = (
          SELECT count(*)::integer FROM "PropiedadVista" v WHERE v."propiedadId" = p.id
        ),
        "consultas" = (
          SELECT count(*)::integer FROM "Contacto" c WHERE c."propiedadId" = p.id
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Contacto" c
        SET "visitasFisicas" = COALESCE((
          SELECT sum(e.delta)::integer FROM "VisitaFisicaEvento" e WHERE e."contactoId" = c.id
        ), 0)
      `);
    }

    return {
      mode: apply ? 'apply' : 'dry-run',
      propertyViewMismatches: countOf(views),
      propertyContactMismatches: countOf(contacts),
      physicalVisitMismatches: countOf(physical),
      impossibleNegativeEventTotals,
    };
  });
}
