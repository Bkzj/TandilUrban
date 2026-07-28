import { NextResponse } from 'next/server';
import { EstadoPropiedad, Prisma } from '@prisma/client';

import { onPropiedadPublicada } from '@/lib/match-engine';

import { scheduleAssetCleanup, schedulePropertyDeletion } from '@/lib/cloudinary-cleanup';
import { normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { resolvePropertyAssets } from '@/lib/panel-property-assets';
import { validarPropiedadPayload } from '@/lib/panel-propiedad-payload';
import { computeEsExclusiva } from '@/lib/propiedad-exclusiva';
import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth';
import { requirePropertyAccess } from '@/lib/panel-authorization';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

const ESTADOS_VALIDOS = Object.values(EstadoPropiedad) as string[];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { propertyWhere } = await requirePropertyAccess(id);
    const body = (await request.json()) as { estado?: unknown };
    if (typeof body.estado !== 'string' || !ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const nuevoEstado = body.estado as EstadoPropiedad;

    const propiedad = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, inmobiliariaId: true, agenteId: true, estado: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    const estadoAnterior = propiedad.estado;

    await prisma.propiedad.update({
      where: { id: propiedad.id },
      data: { estado: nuevoEstado },
    });

    if (
      nuevoEstado === EstadoPropiedad.DISPONIBLE &&
      estadoAnterior !== EstadoPropiedad.DISPONIBLE
    ) {
      void onPropiedadPublicada(propiedad.id).catch(console.error);
    }

    return NextResponse.json({ ok: true, estado: nuevoEstado }, { status: 200 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error('[PATCH /api/panel/propiedades/[id]]', error);
    return NextResponse.json({ error: 'No se pudo actualizar el estado.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { propertyWhere } = await requirePropertyAccess(id);
    const propiedad = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, inmobiliariaId: true, agenteId: true, imagenes: true, planoUrl: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    const body = await request.json();
    const payload = validarPropiedadPayload(body);
    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const data = payload.data;
    const assets = await resolvePropertyAssets({
      tenantId: propiedad.inmobiliariaId,
      propertyId: propiedad.id,
      images: data.imagenes,
      planoUrl: data.planoUrl ?? null,
      legacyImages: normalizePropiedadImagenesDb(propiedad.imagenes),
      legacyPlanoUrl: propiedad.planoUrl,
    });

    const removedAssets = await prisma.cloudinaryAsset.findMany({
      where: {
        inmobiliariaId: propiedad.inmobiliariaId,
        propertyId: propiedad.id,
        status: 'BOUND',
        id: { notIn: assets.assetIds },
      },
      select: { id: true },
    });
    await scheduleAssetCleanup({
      tenantId: propiedad.inmobiliariaId,
      propertyId: propiedad.id,
      assetIds: removedAssets.map(({ id: assetId }) => assetId),
    });
    const esLote = data.tipo === 'Lote';
    const esExclusiva = computeEsExclusiva(data);

    await prisma.propiedad.update({
      where: { id: propiedad.id },
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
        m2Cubiertos: esLote ? 0 : data.m2Cubiertos ?? 0,
        ambientes: esLote ? 0 : Math.round(data.ambientes ?? 0),
        dormitorios: esLote ? 0 : data.dormitorios,
        banos: esLote ? 0 : data.banos,
        cocheras: esLote ? 0 : data.cocheras,
        caracteristicas: data.caracteristicas,
        imagenes: assets.images,
        planoUrl: assets.planoUrl,
        esExclusiva,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[PUT /api/panel/propiedades/[id]]', error.code, error.message);
      return NextResponse.json({ error: 'No se pudo actualizar la propiedad.' }, { status: 500 });
    }
    console.error('[PUT /api/panel/propiedades/[id]]', error);
    return NextResponse.json({ error: 'No se pudo actualizar la propiedad.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { propertyWhere } = await requirePropertyAccess(id);
    const propiedad = await prisma.propiedad.findFirst({
      where: propertyWhere,
      select: { id: true, inmobiliariaId: true, agenteId: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    await schedulePropertyDeletion({
      tenantId: propiedad.inmobiliariaId,
      propertyId: propiedad.id,
    });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[DELETE /api/panel/propiedades/[id]]', error.code, error.message);
      return NextResponse.json({ error: 'No se pudo eliminar la propiedad.' }, { status: 500 });
    }
    console.error('[DELETE /api/panel/propiedades/[id]]', error);
    return NextResponse.json({ error: 'No se pudo eliminar la propiedad.' }, { status: 500 });
  }
}
