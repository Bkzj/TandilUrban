import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { twoFactorSetupStartSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import { startTwoFactorSetup } from '@/server/auth/two-factor-service';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.two_factor_setup_start.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    const payload = await parseJsonBody(request, twoFactorSetupStartSchema, REQUEST_LIMITS.authJsonBytes);
    const rate = await configuredRateLimitStore().consume(`two-factor-setup:user:${hashAuthSecret(identity.userId).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.twoFactorSetupUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const env = getServerEnvironment();
    const result = await startTwoFactorSetup({ userId: identity.userId, expectedSessionVersion: identity.sessionVersion, password: payload.password }, { client: prisma, encryptionKey: env.AUTH_ENCRYPTION_KEY!, issuer: env.AUTH_TOTP_ISSUER, setupTtlSeconds: env.AUTH_TOTP_CHALLENGE_TTL_SECONDS, requestId });
    if (result.status === 'invalid') throw new ApiError('VALIDATION_ERROR', { message: 'No pudimos confirmar tu contraseña.' });
    if (result.status === 'already_enabled') throw new ApiError('CONFLICT', { message: 'La verificación en dos pasos ya está activada.' });
    return NextResponse.json({ manualKey: result.manualKey, qrDataUrl: result.qrDataUrl, expiresAt: result.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
