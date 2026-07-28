import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { issueVerificationToken } from '@/lib/auth-verification';
import { sendVerificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { resendVerificationSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';

const GENERIC_MESSAGE =
  'Si la cuenta existe y todavía requiere verificación, enviaremos un nuevo correo.';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.verification_resend.failed', async (requestId) => {
    const rate = await configuredRateLimitStore().consume(`verify-resend:ip:${requestIp(request)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    }

    const { email } = await parseJsonBody(
      request,
      resendVerificationSchema,
      REQUEST_LIMITS.authJsonBytes,
    );
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
      if (!sent.ok) {
        serverLogger.warn('auth.verification_resend.delivery_failed', {
          requestId,
          userId: user.id,
        });
      }
    }
    return NextResponse.json({ message: GENERIC_MESSAGE });
  });
}
