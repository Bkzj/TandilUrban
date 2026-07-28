import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import {
  scheduleAssetCleanupInTransaction,
  schedulePropertyDeletion,
} from '@/lib/cloudinary-cleanup';
import { onPropiedadPublicada } from '@/lib/match-engine';
import { requirePropertyAccess } from '@/lib/panel-authorization';
import { resolvePropertyAssets } from '@/lib/panel-property-assets';
import { computeEsExclusiva } from '@/lib/propiedad-exclusiva';
import { normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { identifierSchema } from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { createPropertySchema } from '@/lib/validation/property';
import {
  canTransitionPropertyState,
  propertyStateUpdateSchema,
} from '@/lib/validation/property-state';
import { parseJsonBody, validateRouteParams } from '@/lib/validation/request';

const routeParamsSchema = identifierSchema.transform((id) => ({ id }));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteHandler(request, 'panel.property_state.failed', async (requestId) => {
    const route = validateRouteParams((await params).id, routeParamsSchema);
    const { propertyWhere } = await requirePropertyAccess(route.id);
    const body = await parseJsonBody(
      request,
      propertyStateUpdateSchema,
      REQUEST_LIMITS.authJsonBytes,
    );
    const property = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, estado: true },
    });
    if (!property) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });
    if (!canTransitionPropertyState(property.estado, body.estado)) {
      throw new ApiError('CONFLICT', {
        message: `No se puede pasar de ${property.estado} a ${body.estado}.`,
      });
    }
    if (property.estado !== body.estado) {
      const updated = await prisma.propiedad.updateMany({
        where: { id: property.id, estado: property.estado },
        data: { estado: body.estado },
      });
      if (updated.count !== 1) {
        throw new ApiError('CONFLICT', { message: 'La propiedad cambió mientras se actualizaba.' });
      }
      if (body.estado === 'DISPONIBLE') {
        void onPropiedadPublicada(property.id).catch((error) => {
          serverLogger.warn('property.match_notification_deferred', {
            requestId,
            propertyId: property.id,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
        });
      }
    }
    return NextResponse.json({ ok: true, estado: body.estado });
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteHandler(request, 'panel.property_update.failed', async () => {
    const route = validateRouteParams((await params).id, routeParamsSchema);
    const context = await requirePropertyAccess(route.id);
    const property = await prisma.propiedad.findFirst({
      where: context.propertyWhere,
      select: {
        id: true,
        inmobiliariaId: true,
        agenteId: true,
        imagenes: true,
        planoUrl: true,
      },
    });
    if (!property) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });

    const data = await parseJsonBody(
      request,
      createPropertySchema,
      REQUEST_LIMITS.propertyJsonBytes,
    );
    const assets = await resolvePropertyAssets({
      tenantId: property.inmobiliariaId,
      propertyId: property.id,
      images: data.imagenes,
      planoUrl: data.planoUrl,
      legacyImages: normalizePropiedadImagenesDb(property.imagenes),
      legacyPlanoUrl: property.planoUrl,
    });
    const isLot = data.tipo === 'Lote';

    await prisma.$transaction(async (tx) => {
      const stillAccessible = await tx.propiedad.findFirst({
        where: context.propertyWhere,
        select: { id: true },
      });
      if (!stillAccessible) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });

      const removedAssets = await tx.cloudinaryAsset.findMany({
        where: {
          inmobiliariaId: property.inmobiliariaId,
          propertyId: property.id,
          status: 'BOUND',
          id: { notIn: assets.assetIds },
        },
        select: { id: true },
      });
      await scheduleAssetCleanupInTransaction(tx, {
        tenantId: property.inmobiliariaId,
        propertyId: property.id,
        assetIds: removedAssets.map(({ id }) => id),
      });
      await tx.propiedad.update({
        where: { id: property.id },
        data: {
          titulo: data.titulo,
          descripcion: data.descripcion,
          tipo: data.tipo,
          operacion: data.operacion,
          precio: data.precio,
          moneda: data.moneda,
          expensas: data.expensas,
          direccion: data.direccion,
          barrio: data.barrio,
          latitud: data.lat,
          longitud: data.lng,
          m2Total: data.m2Total,
          m2Cubiertos: isLot ? 0 : data.m2Cubiertos ?? 0,
          ambientes: isLot ? 0 : data.ambientes ?? 0,
          dormitorios: isLot ? 0 : data.dormitorios,
          banos: isLot ? 0 : data.banos,
          cocheras: isLot ? 0 : data.cocheras,
          caracteristicas: data.caracteristicas,
          imagenes: assets.images,
          planoUrl: assets.planoUrl,
          esExclusiva: computeEsExclusiva(data),
        },
      });
    });
    return new NextResponse(null, { status: 200 });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRouteHandler(request, 'panel.property_delete.failed', async () => {
    const route = validateRouteParams((await params).id, routeParamsSchema);
    const { propertyWhere } = await requirePropertyAccess(route.id);
    const property = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, inmobiliariaId: true },
    });
    if (!property) throw new ApiError('NOT_FOUND', { message: 'Propiedad no encontrada.' });
    await schedulePropertyDeletion({
      tenantId: property.inmobiliariaId,
      propertyId: property.id,
    });
    return new NextResponse(null, { status: 200 });
  });
}
