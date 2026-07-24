import { NextResponse } from 'next/server';

import { issueVerificationToken } from '@/lib/auth-verification';
import { sendVerificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';

const GENERIC_MESSAGE =
  'Si la cuenta existe y todavía requiere verificación, enviaremos un nuevo correo.';

export async function POST(request: Request) {
  const rate = await configuredRateLimitStore().consume(`verify-resend:ip:${requestIp(request)}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intentá nuevamente más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const body: unknown = await request.json();
    const email = body && typeof body === 'object' && typeof (body as Record<string, unknown>).email === 'string'
      ? String((body as Record<string, unknown>).email).trim().toLowerCase()
      : '';

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, emailVerifiedAt: true },
      });
      if (user && user.emailVerifiedAt === null) {
        const issued = issueVerificationToken();
        await prisma.$transaction([
          prisma.verificationToken.deleteMany({
            where: { OR: [{ email: user.email }, { expiresAt: { lt: new Date() } }] },
          }),
          prisma.verificationToken.create({
            data: {
              email: user.email,
              userId: user.id,
              token: issued.tokenHash,
              expiresAt: issued.expiresAt,
            },
          }),
        ]);
        const sent = await sendVerificationEmail(user.email, issued.rawToken);
        if (!sent.ok) console.error('[resend-verification] No se pudo enviar el correo.');
      }
    }
    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('[resend-verification]', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}
