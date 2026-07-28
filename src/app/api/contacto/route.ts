import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enviarMailNotificacionLead } from '@/lib/resend';
import type { ContactoPayload } from '@/types/api';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import { createPublicContactInquiry } from '@/lib/public-contact-service';

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

  if (typeof telefono !== 'string' || telefono.trim().length < 6) {
    return { ok: false, error: 'El teléfono es obligatorio (mínimo 6 caracteres).' };
  }
  const telefonoNorm = telefono.trim();

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

    const result = await createPublicContactInquiry(payload.data, {
      findPublicProperty: async (propertyId) => {
        const propiedad = await prisma.propiedad.findFirst({
          where: { id: propertyId, ...PUBLIC_PROPERTY_WHERE },
          select: {
            id: true,
            titulo: true,
            agente: { select: { email: true } },
            inmobiliaria: {
              select: {
                user: { select: { email: true } },
              },
            },
          },
        });
        return propiedad
          ? {
              id: propiedad.id,
              titulo: propiedad.titulo,
              agenteEmail: propiedad.agente?.email ?? null,
              adminEmail: propiedad.inmobiliaria.user.email,
            }
          : null;
      },
      persistInquiry: async (propertyId, data) => {
        const [, contacto] = await prisma.$transaction([
          prisma.propiedad.update({
            where: { id: propertyId },
            data: { consultas: { increment: 1 } },
          }),
          prisma.contacto.create({
            data: {
              nombre: data.nombre,
              email: data.email,
              telefono: data.telefono,
              mensaje: data.mensaje,
              propiedadId: propertyId,
            },
            select: { id: true, createdAt: true },
          }),
        ]);
        return contacto;
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'La propiedad no está disponible.' }, { status: 404 });
    }

    try {
      const mailResult = await enviarMailNotificacionLead({
        agenteEmail: result.property.agenteEmail,
        adminEmail: result.property.adminEmail,
        clienteEmail: payload.data.email,
        nombreLead: payload.data.nombre,
        telefonoLead: payload.data.telefono,
        propiedadTitulo: result.property.titulo,
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
        contacto: { id: result.receipt.id, createdAt: result.receipt.createdAt },
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
