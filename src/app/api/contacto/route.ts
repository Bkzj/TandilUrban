import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enviarMailNotificacionLead } from '@/lib/resend';
import type { ContactoPayload } from '@/types/api';

function validarPayload(body: unknown): { ok: true; data: ContactoPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo de la solicitud es invalido.' };
  }

  const { nombre, email, mensaje, propiedadId, telefono } = body as Record<string, unknown>;

  if (typeof nombre !== 'string' || nombre.trim().length < 3) {
    return { ok: false, error: 'El nombre es obligatorio y debe tener al menos 3 caracteres.' };
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El email no tiene un formato valido.' };
  }

  let telefonoNorm: string | null = null;
  if (telefono !== undefined && telefono !== null) {
    if (typeof telefono !== 'string') {
      return { ok: false, error: 'El telefono debe ser texto.' };
    }
    const t = telefono.trim();
    telefonoNorm = t.length > 0 ? t : null;
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
      telefono: telefonoNorm,
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

    const propiedad = await prisma.propiedad.findUnique({
      where: { id: payload.data.propiedadId },
      select: {
        id: true,
        titulo: true,
        agenteId: true,
        inmobiliaria: {
          select: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!propiedad) {
      return NextResponse.json({ error: 'La propiedad indicada no existe.' }, { status: 404 });
    }

    const agenteEmail =
      propiedad.agenteId != null
        ? (
            await prisma.user.findUnique({
              where: { id: propiedad.agenteId },
              select: { email: true },
            })
          )?.email
        : null;

    const adminEmail = propiedad.inmobiliaria.user.email;

    const [, contacto] = await prisma.$transaction([
      prisma.propiedad.update({
        where: { id: propiedad.id },
        data: { consultas: { increment: 1 } },
      }),
      prisma.contacto.create({
        data: {
          nombre: payload.data.nombre,
          email: payload.data.email,
          telefono: payload.data.telefono ?? null,
          mensaje: payload.data.mensaje,
          propiedadId: payload.data.propiedadId,
        },
      }),
    ]);

    try {
      const mailResult = await enviarMailNotificacionLead({
        agenteEmail,
        adminEmail,
        clienteEmail: payload.data.email,
        nombreLead: payload.data.nombre,
        telefonoLead: payload.data.telefono,
        propiedadTitulo: propiedad.titulo,
        mensaje: payload.data.mensaje,
      });

      if (!mailResult.ok && mailResult.errors?.length) {
        console.error('[api/contacto] Resend:', mailResult.errors.join(' | '));
      }
    } catch (mailErr) {
      console.error('[api/contacto] Error enviando mails (no fatal):', mailErr);
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Consulta registrada.',
        contacto: { id: contacto.id, createdAt: contacto.createdAt },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al crear contacto:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar el contacto. Intentalo nuevamente.' },
      { status: 500 }
    );
  }
}
