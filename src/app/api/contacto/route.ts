import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ContactoPayload } from '@/types/api';

function validarPayload(body: unknown): { ok: true; data: ContactoPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo de la solicitud es invalido.' };
  }

  const { nombre, email, mensaje, propiedadId } = body as Record<string, unknown>;

  if (typeof nombre !== 'string' || nombre.trim().length < 3) {
    return { ok: false, error: 'El nombre es obligatorio y debe tener al menos 2 caracteres.' };
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El email no tiene un formato valido.' };
  }

  if (typeof mensaje !== 'string' || mensaje.trim().length < 10) {
    return { ok: false, error: 'El mensaje es obligatorio y debe tener al menos 10 caracteres.' };
  }

  if (typeof propiedadId !== 'string' || propiedadId.trim().length === 0) {
    return { ok: false, error: 'propiedadId es obligatorio.' };
  }

  return {
    ok: true,
    data: {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      mensaje: mensaje.trim(),
      propiedadId: propiedadId.trim(),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = validarPayload(body);

    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const propiedadExiste = await prisma.propiedad.findUnique({
      where: { id: payload.data.propiedadId },
      select: { id: true },
    });

    if (!propiedadExiste) {
      return NextResponse.json({ error: 'La propiedad indicada no existe.' }, { status: 404 });
    }

    const contacto = await prisma.contacto.create({
      data: payload.data,
    });

    return NextResponse.json(
      {
        message: 'Contacto recibido correctamente.',
        contacto,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear contacto:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar el contacto. Intentalo nuevamente.' },
      { status: 500 }
    );
  }
}

