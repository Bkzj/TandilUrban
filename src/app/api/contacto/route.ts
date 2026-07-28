import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { fingerprintIdempotentInput, hashIdempotencyKey } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { createPublicContactInquiry } from '@/lib/public-contact-service';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import { enviarMailNotificacionLead } from '@/lib/resend';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { idempotencyKeySchema } from '@/lib/validation/common';
import { publicContactSchema } from '@/lib/validation/contact';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';

export async function POST(request: Request) {
  return runRouteHandler(request, 'public_contact.failed', async (requestId) => {
    const rawKey = request.headers.get('idempotency-key');
    const parsedKey = idempotencyKeySchema.safeParse(rawKey);
    if (!parsedKey.success) {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'La clave de idempotencia es inválida.',
        fields: { idempotencyKey: ['La clave de idempotencia es inválida.'] },
      });
    }
    const payload = await parseJsonBody(
      request,
      publicContactSchema,
      REQUEST_LIMITS.contactJsonBytes,
    );
    const idempotencyKey = hashIdempotencyKey('public-contact', parsedKey.data);
    const fingerprint = fingerprintIdempotentInput('public-contact', payload);

    const result = await createPublicContactInquiry(
      payload,
      {
        findPublicProperty: async (propertyId) => {
          const property = await prisma.propiedad.findFirst({
            where: { id: propertyId, ...PUBLIC_PROPERTY_WHERE },
            select: {
              id: true,
              titulo: true,
              agente: { select: { email: true } },
              inmobiliaria: { select: { user: { select: { email: true } } } },
            },
          });
          return property
            ? {
                id: property.id,
                titulo: property.titulo,
                agenteEmail: property.agente?.email ?? null,
                adminEmail: property.inmobiliaria.user.email,
              }
            : null;
        },
        persistInquiry: async (propertyId, data) => {
          const existing = await prisma.contacto.findUnique({
            where: { idempotencyKey },
            select: {
              id: true,
              createdAt: true,
              propiedadId: true,
              idempotencyFingerprint: true,
            },
          });
          if (existing) {
            if (
              existing.propiedadId !== propertyId ||
              existing.idempotencyFingerprint !== fingerprint
            ) {
              throw new ApiError('CONFLICT', {
                message: 'La clave de idempotencia ya fue usada con otros datos.',
              });
            }
            return { id: existing.id, createdAt: existing.createdAt, created: false };
          }

          try {
            return await prisma.$transaction(async (tx) => {
              const contact = await tx.contacto.create({
                data: {
                  nombre: data.nombre,
                  email: data.email,
                  telefono: data.telefono,
                  mensaje: data.mensaje,
                  propiedadId: propertyId,
                  origen: 'PUBLICO',
                  idempotencyKey,
                  idempotencyFingerprint: fingerprint,
                },
                select: { id: true, createdAt: true },
              });
              await tx.propiedad.update({
                where: { id: propertyId },
                data: { consultas: { increment: 1 } },
                select: { id: true },
              });
              return { ...contact, created: true };
            });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              const replay = await prisma.contacto.findUnique({
                where: { idempotencyKey },
                select: {
                  id: true,
                  createdAt: true,
                  propiedadId: true,
                  idempotencyFingerprint: true,
                },
              });
              if (
                replay?.propiedadId === propertyId &&
                replay.idempotencyFingerprint === fingerprint
              ) {
                return { id: replay.id, createdAt: replay.createdAt, created: false };
              }
              throw new ApiError('CONFLICT', {
                message: 'La clave de idempotencia ya fue usada con otros datos.',
              });
            }
            throw error;
          }
        },
      },
      idempotencyKey,
    );

    if (!result.ok) {
      throw new ApiError('NOT_FOUND', { message: 'La propiedad no está disponible.' });
    }
    if (result.receipt.created) {
      try {
        const mailResult = await enviarMailNotificacionLead({
          agenteEmail: result.property.agenteEmail,
          adminEmail: result.property.adminEmail,
          clienteEmail: payload.email,
          nombreLead: payload.nombre,
          telefonoLead: payload.telefono,
          propiedadTitulo: result.property.titulo,
          mensaje: payload.mensaje,
        });
        if (!mailResult.ok) {
          serverLogger.warn('public_contact.notification_deferred', {
            requestId,
            contactId: result.receipt.id,
            providerErrorCount: mailResult.errors?.length ?? 0,
          });
        }
      } catch (error) {
        serverLogger.warn('public_contact.notification_deferred', {
          requestId,
          contactId: result.receipt.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Consulta registrada.',
      contacto: {
        id: result.receipt.id,
        createdAt: result.receipt.createdAt,
      },
    });
  });
}
