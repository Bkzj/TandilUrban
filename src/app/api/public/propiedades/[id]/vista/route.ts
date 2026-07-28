import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  deriveRotatingAnonymousKey,
  registerPropertyView,
} from '@/lib/property-view-service';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import { configuredRateLimitStore } from '@/lib/rate-limit';

const VISITOR_COOKIE = 'propea_view_session';
const MAX_BODY_BYTES = 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  const { id } = await params;
  const secret = process.env.VIEW_TRACKING_SECRET?.trim();
  if (!secret) {
    console.error('[property-view] tracking disabled: missing VIEW_TRACKING_SECRET');
    return new NextResponse(null, { status: 204 });
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const storedToken = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1);
  const visitorToken = storedToken && /^[a-f0-9-]{36}$/i.test(storedToken)
    ? storedToken
    : randomUUID();
  const now = new Date();
  const anonymousKey = deriveRotatingAnonymousKey({ secret, visitorToken, now });
  const previousAnonymousKey = deriveRotatingAnonymousKey({
    secret,
    visitorToken,
    now: new Date(now.getTime() - 24 * 60 * 60 * 1000),
  });

  try {
    const rate = await configuredRateLimitStore().consume(
      `property-view:${anonymousKey}`,
      { limit: 30, windowMs: 60 * 60 * 1000 },
      now.getTime(),
    );
    if (!rate.allowed) return new NextResponse(null, { status: 429 });

    const actor = await getCurrentUser();
    const result = await registerPropertyView(
      {
        propertyId: id,
        anonymousKey,
        previousAnonymousKey,
        actor: actor ? { role: actor.rol } : null,
        headers: request.headers,
        now,
      },
      {
        findPublicProperty: (propertyId) =>
          prisma.propiedad.findFirst({
            where: { id: propertyId, ...PUBLIC_PROPERTY_WHERE },
            select: { id: true, inmobiliariaId: true },
          }),
        recordIfOutsideWindow: async ({
          property,
          anonymousKey: key,
          deduplicationKeys,
          since,
          now: recordedAt,
        }) =>
          prisma.$transaction(async (tx) => {
            const lockKey = `${property.id}:${key}`;
            await tx.$executeRaw(
              Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
            );
            const existing = await tx.propiedadVista.findFirst({
              where: {
                propiedadId: property.id,
                anonymousKey: { in: [...deduplicationKeys] },
                createdAt: { gte: since },
              },
              select: { id: true },
            });
            if (existing) return false;
            await tx.propiedadVista.create({
              data: {
                propiedadId: property.id,
                inmobiliariaId: property.inmobiliariaId,
                anonymousKey: key,
                createdAt: recordedAt,
              },
              select: { id: true },
            });
            await tx.propiedad.update({
              where: { id: property.id },
              data: { visitas: { increment: 1 } },
              select: { id: true },
            });
            return true;
          }),
      },
    );

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 });
    }
    const response = new NextResponse(null, { status: 204 });
    if (!storedToken) {
      response.cookies.set(VISITOR_COOKIE, visitorToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 48 * 60 * 60,
        path: '/',
      });
    }
    return response;
  } catch (error) {
    console.error('[property-view] non-fatal tracking failure', {
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return new NextResponse(null, { status: 204 });
  }
}
