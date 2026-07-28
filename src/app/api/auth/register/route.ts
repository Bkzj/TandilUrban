import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';

import { issueVerificationToken } from '@/lib/auth-verification';
import { sendVerificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { registerSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.register.failed', async (requestId) => {
    const payload = await parseJsonBody(request, registerSchema, REQUEST_LIMITS.authJsonBytes);
    const exists = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { message: 'Si el email puede registrarse, recibirás instrucciones para verificarlo.' },
        { status: 202 },
      );
    }

    const passwordHash = await hash(payload.password, 12);
    const verificationToken = issueVerificationToken();
    const user = await prisma.user.create({
      data: {
        nombre: payload.nombre,
        email: payload.email,
        passwordHash,
        emailVerifiedAt: null,
        verificationTokens: {
          create: {
            email: payload.email,
            token: verificationToken.tokenHash,
            expiresAt: verificationToken.expiresAt,
          },
        },
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    const mailResult = await sendVerificationEmail(payload.email, verificationToken.rawToken);
    if (!mailResult.ok) {
      serverLogger.warn('auth.register.verification_delivery_deferred', {
        requestId,
        userId: user.id,
        providerErrorName: mailResult.error instanceof Error ? mailResult.error.name : 'DeliveryError',
      });
    }

    return NextResponse.json(
      {
        message: !mailResult.ok
          ? 'La cuenta fue creada, pero el correo no pudo enviarse. Solicitá un nuevo enlace desde el ingreso.'
          : !mailResult.delivered && process.env.NODE_ENV !== 'production'
            ? 'Usuario registrado. En desarrollo el mail no se envió; podés solicitar un nuevo enlace.'
            : 'Usuario registrado. Te enviamos un email de verificación para activar tu cuenta.',
        user,
      },
      { status: 201 },
    );
  });
}

