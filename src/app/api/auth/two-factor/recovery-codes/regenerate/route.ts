import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { twoFactorRegenerateSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import { regenerateTwoFactorRecoveryCodes } from '@/server/auth/two-factor-service';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.recovery_codes_regenerate.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    const payload = await parseJsonBody(request, twoFactorRegenerateSchema, REQUEST_LIMITS.authJsonBytes);
    const rate = await configuredRateLimitStore().consume(`two-factor-management:user:${hashAuthSecret(identity.userId).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.twoFactorManagementUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const env = getServerEnvironment();
    const result = await regenerateTwoFactorRecoveryCodes({ userId: identity.userId, expectedSessionVersion: identity.sessionVersion, password: payload.password, code: payload.code }, { client: prisma, encryptionKey: env.AUTH_ENCRYPTION_KEY!, recoveryCodeCount: env.AUTH_RECOVERY_CODE_COUNT, requestId });
    if (result.status === 'invalid') throw new ApiError('VALIDATION_ERROR', { message: 'No pudimos confirmar los datos.' });
    if (!result.notificationSucceeded) serverLogger.warn('auth.recovery_codes_regenerated.notification_deferred', { requestId });
    return NextResponse.json({ recoveryCodes: result.recoveryCodes }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
