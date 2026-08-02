import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { getServerAuthSession } from '@/lib/auth';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { changePasswordSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { changeAuthenticatedPassword } from '@/server/auth/password-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import type { SessionUserAugmented } from '@/types/auth';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.password_change.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const payload = await parseJsonBody(request, changePasswordSchema, REQUEST_LIMITS.authJsonBytes);
    const session = await getServerAuthSession();
    const sessionUser = session?.user as SessionUserAugmented | undefined;
    if (!sessionUser?.id || sessionUser.sessionVersion === undefined) {
      throw new ApiError('UNAUTHORIZED');
    }

    const store = configuredRateLimitStore();
    const ipRate = await store.consume(
      `password-change:ip:${requestIp(request)}`,
      AUTH_RATE_LIMIT_POLICIES.passwordChangeIp,
    );
    const userRate = await store.consume(
      `password-change:user:${hashAuthSecret(sessionUser.id).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.passwordChangeUser,
    );
    if (!ipRate.allowed || !userRate.allowed) {
      throw new ApiError('RATE_LIMITED', {
        retryAfterSeconds: Math.max(ipRate.retryAfterSeconds, userRate.retryAfterSeconds),
      });
    }

    const result = await changeAuthenticatedPassword({
      userId: sessionUser.id,
      expectedSessionVersion: sessionUser.sessionVersion,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    }, { client: prisma, requestId });
    if (result.status === 'invalid_session') throw new ApiError('UNAUTHORIZED');
    if (result.status === 'invalid_current_password') {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'No pudimos confirmar la contraseña actual.',
      });
    }
    if (result.status === 'same_password') {
      throw new ApiError('CONFLICT', {
        message: 'Elegí una contraseña diferente de la actual.',
      });
    }
    if (!result.notificationSucceeded) {
      serverLogger.warn('auth.password_change.notification_deferred', { requestId });
    }
    return NextResponse.json({
      message: 'Contraseña actualizada. Por seguridad, iniciá sesión nuevamente.',
    });
  });
}
