import { NextResponse } from 'next/server';
import { EstadoPropiedad, Prisma } from '@prisma/client';

import { onPropiedadPublicada } from '@/lib/match-engine';

import {
  configureCloudinary,
  cloudinary,
  isCloudinaryServerConfigured,
  managedPropertyFoldersFromPublicIds,
} from '@/lib/cloudinary';
import { collectPublicIdsForDeletion, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { userCanModifyPropiedad } from '@/lib/panel-propiedad-access';
import { validarPropiedadPayload } from '@/lib/panel-propiedad-payload';
import { prisma } from '@/lib/prisma';
import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tenés que iniciar sesión.' }, { status: 401 });
    }

    assertNotPublicPortalUser(user);

    const { id } = await params;
    const body = (await request.json()) as { estado?: unknown };
    if (typeof body.estado !== 'string' || !ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const nuevoEstado = body.estado as EstadoPropiedad;

    const propiedad = await prisma.propiedad.findUnique({
      where: { id },
      select: { id: true, inmobiliariaId: true, agenteId: true, estado: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    if (!userCanModifyPropiedad(user, propiedad)) {
      return NextResponse.json(
        { error: 'No tenés permiso para modificar esta propiedad.' },
        { status: 403 }
      );
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tenés que iniciar sesión.' }, { status: 401 });
    }

    assertNotPublicPortalUser(user);

    const { id } = await params;
    const propiedad = await prisma.propiedad.findUnique({
      where: { id },
      select: { id: true, inmobiliariaId: true, agenteId: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    if (!userCanModifyPropiedad(user, propiedad)) {
      return NextResponse.json(
        { error: 'No tenés permiso para modificar esta propiedad.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const payload = validarPropiedadPayload(body);
    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const data = payload.data;
    const esLote = data.tipo === 'Lote';

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
        imagenes: data.imagenes,
        planoUrl: data.planoUrl,
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tenés que iniciar sesión.' }, { status: 401 });
    }

    assertNotPublicPortalUser(user);

    const { id } = await params;
    const propiedad = await prisma.propiedad.findUnique({
      where: { id },
      select: { id: true, inmobiliariaId: true, agenteId: true, imagenes: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }

    if (!userCanModifyPropiedad(user, propiedad)) {
      return NextResponse.json(
        { error: 'No tenés permiso para eliminar esta propiedad.' },
        { status: 403 }
      );
    }

    const items = normalizePropiedadImagenesDb(propiedad.imagenes);

    if (isCloudinaryServerConfigured()) {
      try {
        configureCloudinary();
        const publicIds = collectPublicIdsForDeletion(items);
        if (publicIds.length > 0) {
          await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
        }
        const folders = managedPropertyFoldersFromPublicIds(publicIds);
        for (const folder of folders) {
          try {
            await cloudinary.api.delete_folder(folder);
          } catch {
            /* carpeta no vacía o ya eliminada */
          }
        }
      } catch (cloudErr) {
        console.error('[DELETE /api/panel/propiedades/[id]] Cloudinary:', cloudErr);
        return NextResponse.json(
          { error: 'No se pudieron eliminar las imágenes en la nube. Intentá de nuevo.' },
          { status: 502 }
        );
      }
    }

    await prisma.propiedad.delete({ where: { id: propiedad.id } });
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
