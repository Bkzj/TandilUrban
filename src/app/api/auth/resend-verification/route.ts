import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { resendVerificationSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { resendAccountVerification } from '@/server/auth/verification-service';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';

export const GENERIC_RESEND_MESSAGE =
  'Si la cuenta existe y todavía requiere verificación, enviaremos un nuevo correo.';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.verification_resend.failed', async (requestId) => {
    const { email } = await parseJsonBody(
      request,
      resendVerificationSchema,
      REQUEST_LIMITS.authJsonBytes,
    );
    const store = configuredRateLimitStore();
    const rate = await store.consume(`verify-resend:ip:${requestIp(request)}`, {
      ...AUTH_RATE_LIMIT_POLICIES.verificationResendIp,
    });
    if (!rate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    }
    const identityRate = await store.consume(
      authIdentityRateLimitKey('verify-resend', email),
      AUTH_RATE_LIMIT_POLICIES.verificationResendIdentity,
    );
    if (!identityRate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: identityRate.retryAfterSeconds });
    }
    const environment = getServerEnvironment();
    const result = await resendAccountVerification(email, {
      client: prisma,
      requestId,
      verificationTtlMs: environment.AUTH_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
    });
    if (result.eligible && !result.deliverySucceeded) {
      serverLogger.warn('auth.verification_resend.delivery_deferred', { requestId });
    }
    return NextResponse.json({ message: GENERIC_RESEND_MESSAGE });
  });
}
