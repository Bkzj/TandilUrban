import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import {
  GENERIC_PASSWORD_RESET_REQUEST_MESSAGE,
  requestPasswordReset,
} from '@/server/auth/password-service';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.password_reset_request.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { email } = await parseJsonBody(request, forgotPasswordSchema, REQUEST_LIMITS.authJsonBytes);
    const store = configuredRateLimitStore();
    const ipRate = await store.consume(
      `password-reset-request:ip:${requestIp(request)}`,
      AUTH_RATE_LIMIT_POLICIES.passwordResetRequestIp,
    );
    const identityRate = await store.consume(
      authIdentityRateLimitKey('password-reset-request', email),
      AUTH_RATE_LIMIT_POLICIES.passwordResetRequestIdentity,
    );
    if (!ipRate.allowed || !identityRate.allowed) {
      throw new ApiError('RATE_LIMITED', {
        retryAfterSeconds: Math.max(ipRate.retryAfterSeconds, identityRate.retryAfterSeconds),
      });
    }

    const environment = getServerEnvironment();
    const result = await requestPasswordReset(email, {
      client: prisma,
      requestId,
      ttlMinutes: environment.AUTH_PASSWORD_RESET_TTL_MINUTES,
    });
    if (result.eligible && !result.deliverySucceeded) {
      serverLogger.warn('auth.password_reset_request.delivery_deferred', { requestId });
    }
    return NextResponse.json({ message: GENERIC_PASSWORD_RESET_REQUEST_MESSAGE }, { status: 202 });
  });
}
