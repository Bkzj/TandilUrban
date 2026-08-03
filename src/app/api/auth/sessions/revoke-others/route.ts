import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { revokeSessionsBulkSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import { revokeUserSessionsBulk } from '@/server/auth/session-management-service';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.sessions.revoke_others.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    const payload = await parseJsonBody(request, revokeSessionsBulkSchema, REQUEST_LIMITS.authJsonBytes);
    const rate = await configuredRateLimitStore().consume(
      `session-bulk:user:${hashAuthSecret(identity.userId).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.sessionBulkRevokeUser,
    );
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const result = await revokeUserSessionsBulk({
      userId: identity.userId,
      currentSessionId: identity.authSessionId,
      expectedSessionVersion: identity.sessionVersion,
      password: payload.password,
      factor: payload.factor,
      code: payload.code,
    }, { client: prisma, encryptionKey: getServerEnvironment().AUTH_ENCRYPTION_KEY ?? '', includeCurrent: false, requestId });
    if (result.status !== 'revoked') throw new ApiError('VALIDATION_ERROR', { message: result.status === 'second_factor_required' ? 'Ingresá el segundo factor.' : 'No pudimos confirmar los datos.' });
    return NextResponse.json({ message: 'Las demás sesiones fueron cerradas.', revoked: result.count });
  });
}
