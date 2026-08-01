import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { registerSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import {
  PUBLIC_REGISTRATION_MESSAGE,
  registerPublicAccount,
} from '@/server/auth/registration-service';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.register.failed', async (requestId) => {
    const payload = await parseJsonBody(request, registerSchema, REQUEST_LIMITS.authJsonBytes);
    const store = configuredRateLimitStore();
    const ipRate = await store.consume(`register:ip:${requestIp(request)}`, AUTH_RATE_LIMIT_POLICIES.registrationIp);
    if (!ipRate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: ipRate.retryAfterSeconds });
    }
    const identityRate = await store.consume(
      authIdentityRateLimitKey('register', payload.email),
      AUTH_RATE_LIMIT_POLICIES.registrationIdentity,
    );
    if (!identityRate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: identityRate.retryAfterSeconds });
    }

    const environment = getServerEnvironment();
    const result = await registerPublicAccount(payload, {
      client: prisma,
      requestId,
      verificationTtlMs: environment.AUTH_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
    });
    if (result.deliveryAttempted && !result.deliverySucceeded) {
      serverLogger.warn('auth.register.verification_delivery_deferred', { requestId });
    }
    return NextResponse.json({ message: PUBLIC_REGISTRATION_MESSAGE }, { status: 202 });
  });
}
