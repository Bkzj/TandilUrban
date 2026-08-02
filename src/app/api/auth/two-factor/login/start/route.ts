import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { getServerEnvironment } from '@/lib/validation/environment';
import { twoFactorLoginStartSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { beginTwoFactorLogin } from '@/server/auth/two-factor-service';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.two_factor_login_start.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const payload = await parseJsonBody(request, twoFactorLoginStartSchema, REQUEST_LIMITS.authJsonBytes);
    const store = configuredRateLimitStore();
    const [ipRate, identityRate] = await Promise.all([
      store.consume(`two-factor-primary:ip:${requestIp(request)}`, AUTH_RATE_LIMIT_POLICIES.loginIp),
      store.consume(authIdentityRateLimitKey('two-factor-primary', payload.email), AUTH_RATE_LIMIT_POLICIES.loginIdentity),
    ]);
    if (!ipRate.allowed || !identityRate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: Math.max(ipRate.retryAfterSeconds, identityRate.retryAfterSeconds) });
    const environment = getServerEnvironment();
    const result = await beginTwoFactorLogin(payload, { client: prisma, challengeTtlSeconds: environment.AUTH_TOTP_CHALLENGE_TTL_SECONDS, requestId });
    if (result.status === 'invalid') throw new ApiError('UNAUTHORIZED', { message: 'No pudimos iniciar sesión con esos datos.' });
    if (result.status === 'normal') return NextResponse.json({ requiresTwoFactor: false });
    return NextResponse.json({ requiresTwoFactor: true, challengeToken: result.challengeToken, expiresAt: result.expiresAt });
  });
}
