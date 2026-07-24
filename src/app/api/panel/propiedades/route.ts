import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { onPropiedadPublicada } from '@/lib/match-engine';
import { validarPropiedadPayload } from '@/lib/panel-propiedad-payload';
import { bindDraftAssets, resolvePropertyAssets, validateNewPropertyUploadScope } from '@/lib/panel-property-assets';
import { computeEsExclusiva } from '@/lib/propiedad-exclusiva';
import { requireAgencyPublishingContext } from '@/lib/panel-agency-publish';
import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth';

// =============================================================================
// Helpers
// =============================================================================

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

// =============================================================================
// POST — crea una propiedad para la agencia del usuario logueado
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { inmobiliariaId, user } = await requireAgencyPublishingContext();

    const body = await request.json();
    const payload = validarPropiedadPayload(body);
    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }
    const data = payload.data;
    const uploadPropertyId = validateNewPropertyUploadScope(
      inmobiliariaId,
      user.id,
      data.uploadPropertyId,
      data.uploadToken,
    );
    if (!uploadPropertyId && (data.imagenes.length > 0 || data.planoUrl)) {
      return NextResponse.json({ error: 'Las imágenes no tienen un alcance de subida válido.' }, { status: 400 });
    }
    const assets = uploadPropertyId
      ? await resolvePropertyAssets({
          tenantId: inmobiliariaId,
          propertyId: uploadPropertyId,
          images: data.imagenes,
          planoUrl: data.planoUrl ?? null,
        })
      : { images: [], planoUrl: null, assetIds: [] };

    const esLote = data.tipo === 'Lote';
    const esExclusiva = computeEsExclusiva(data);

    const propiedad = await prisma.$transaction(async (tx) => {
      const created = await tx.propiedad.create({
        data: {
        ...(uploadPropertyId ? { id: uploadPropertyId } : {}),
        inmobiliariaId,
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
        m2Cubiertos: esLote ? 0 : data.m2Cubiertos ?? 0,
        ambientes: esLote ? 0 : Math.round(data.ambientes ?? 0),
        dormitorios: esLote ? 0 : data.dormitorios,
        banos: esLote ? 0 : data.banos,
        cocheras: esLote ? 0 : data.cocheras,
        agenteId: user.id,
        caracteristicas: data.caracteristicas,
        imagenes: assets.images,
        planoUrl: assets.planoUrl,
        esExclusiva,
        },
        select: { id: true, titulo: true, estado: true },
      });
      if (assets.assetIds.length > 0) {
        await bindDraftAssets(tx.cloudinaryAsset, {
          assetIds: assets.assetIds,
          tenantId: inmobiliariaId,
          propertyId: created.id,
          userId: user.id,
        });
      }
      return created;
    });

    if (propiedad.estado === 'DISPONIBLE') {
      void onPropiedadPublicada(propiedad.id).catch(console.error);
    }

    return NextResponse.json({ propiedad }, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[POST /api/panel/propiedades] Prisma:', error.code, error.message);
      return NextResponse.json({ error: 'No se pudo guardar la propiedad.' }, { status: 500 });
    }
    console.error('[POST /api/panel/propiedades]', error);
    return NextResponse.json({ error: 'No se pudo guardar la propiedad.' }, { status: 500 });
  }
}
