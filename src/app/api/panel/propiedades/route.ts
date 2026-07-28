import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { fingerprintIdempotentInput, hashIdempotencyKey } from '@/lib/idempotency';
import { onPropiedadPublicada } from '@/lib/match-engine';
import { requireAgencyPublishingContext } from '@/lib/panel-agency-publish';
import {
  bindDraftAssets,
  resolvePropertyAssets,
  validateNewPropertyUploadScope,
} from '@/lib/panel-property-assets';
import { computeEsExclusiva } from '@/lib/propiedad-exclusiva';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { idempotencyKeySchema } from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { createPropertySchema } from '@/lib/validation/property';
import { parseJsonBody } from '@/lib/validation/request';

export async function POST(request: Request) {
  return runRouteHandler(request, 'panel.property_create.failed', async (requestId) => {
    const { inmobiliariaId, user } = await requireAgencyPublishingContext();
    const rawKey = request.headers.get('idempotency-key');
    const parsedKey = idempotencyKeySchema.safeParse(rawKey);
    if (!parsedKey.success) {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'La clave de idempotencia es inválida.',
        fields: { idempotencyKey: ['La clave de idempotencia es inválida.'] },
      });
    }
    const data = await parseJsonBody(
      request,
      createPropertySchema,
      REQUEST_LIMITS.propertyJsonBytes,
    );
    const idempotencyKey = hashIdempotencyKey(
      `property-create:${inmobiliariaId}:${user.id}`,
      parsedKey.data,
    );
    const creationFingerprint = fingerprintIdempotentInput('property-create', data);
    const replay = await prisma.propiedad.findUnique({
      where: { creationIdempotencyKey: idempotencyKey },
      select: { id: true, titulo: true, estado: true, creationFingerprint: true },
    });
    if (replay) {
      if (replay.creationFingerprint !== creationFingerprint) {
        throw new ApiError('CONFLICT', {
          message: 'La clave de idempotencia ya fue usada con otros datos.',
        });
      }
      return NextResponse.json({ propiedad: replay }, { status: 200 });
    }

    const uploadPropertyId = validateNewPropertyUploadScope(
      inmobiliariaId,
      user.id,
      data.uploadPropertyId,
      data.uploadToken,
    );
    if (!uploadPropertyId && (data.imagenes.length > 0 || data.planoUrl)) {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'Las imágenes no tienen un alcance de subida válido.',
      });
    }
    const assets = uploadPropertyId
      ? await resolvePropertyAssets({
          tenantId: inmobiliariaId,
          propertyId: uploadPropertyId,
          images: data.imagenes,
          planoUrl: data.planoUrl,
        })
      : { images: [], planoUrl: null, assetIds: [] };
    const isLot = data.tipo === 'Lote';

    let property: { id: string; titulo: string; estado: 'DISPONIBLE' | 'RESERVADA' | 'PAUSADA' | 'VENDIDA' };
    let createdNow = true;
    try {
      property = await prisma.$transaction(async (tx) => {
        const created = await tx.propiedad.create({
          data: {
            ...(uploadPropertyId ? { id: uploadPropertyId } : {}),
            inmobiliariaId,
            agenteId: user.id,
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
            creationIdempotencyKey: idempotencyKey,
            creationFingerprint,
          },
          select: { id: true, titulo: true, estado: true },
        });
        await bindDraftAssets(tx.cloudinaryAsset, {
          assetIds: assets.assetIds,
          tenantId: inmobiliariaId,
          propertyId: created.id,
          userId: user.id,
        });
        return created;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const concurrentReplay = await prisma.propiedad.findUnique({
        where: { creationIdempotencyKey: idempotencyKey },
        select: { id: true, titulo: true, estado: true, creationFingerprint: true },
      });
      if (!concurrentReplay || concurrentReplay.creationFingerprint !== creationFingerprint) {
        throw new ApiError('CONFLICT', {
          message: 'La clave de idempotencia ya fue usada con otros datos.',
        });
      }
      property = concurrentReplay;
      createdNow = false;
    }

    if (createdNow && property.estado === 'DISPONIBLE') {
      void onPropiedadPublicada(property.id).catch((error) => {
        serverLogger.warn('property.match_notification_deferred', {
          requestId,
          propertyId: property.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      });
    }
    return NextResponse.json({ propiedad: property }, { status: createdNow ? 201 : 200 });
  });
}
