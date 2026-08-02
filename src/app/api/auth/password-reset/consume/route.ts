import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIp } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { serverLogger } from '@/lib/server-logger';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { resetPasswordWithToken } from '@/server/auth/password-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export const INVALID_RESET_MESSAGE =
  'No pudimos restablecer la contraseña. El enlace no es válido o venció.';

export async function POST(request: Request) {
  return runRouteHandler(request, 'auth.password_reset_consume.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const payload = await (async () => {
      try {
        return await parseJsonBody(request, resetPasswordSchema, REQUEST_LIMITS.authJsonBytes);
      } catch (error) {
        if (error instanceof ApiError && error.code !== 'PAYLOAD_TOO_LARGE') {
          throw new ApiError('VALIDATION_ERROR', { message: INVALID_RESET_MESSAGE });
        }
        throw error;
      }
    })();
    const store = configuredRateLimitStore();
    const ipRate = await store.consume(
      `password-reset-consume:ip:${requestIp(request)}`,
      AUTH_RATE_LIMIT_POLICIES.passwordResetConsumeIp,
    );
    const tokenRate = await store.consume(
      `password-reset-consume:token:${hashAuthSecret(payload.token).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.passwordResetConsumeToken,
    );
    if (!ipRate.allowed || !tokenRate.allowed) {
      throw new ApiError('RATE_LIMITED', {
        retryAfterSeconds: Math.max(ipRate.retryAfterSeconds, tokenRate.retryAfterSeconds),
      });
    }

    const result = await resetPasswordWithToken(payload.token, payload.password, {
      client: prisma,
      requestId,
    });
    if (result.status === 'invalid') {
      throw new ApiError('VALIDATION_ERROR', { message: INVALID_RESET_MESSAGE });
    }
    if (result.status === 'same_password') {
      throw new ApiError('CONFLICT', {
        message: 'Elegí una contraseña diferente de la actual.',
      });
    }
    if (!result.notificationSucceeded) {
      serverLogger.warn('auth.password_reset.notification_deferred', { requestId });
    }
    return NextResponse.json({ message: 'Contraseña actualizada. Ya podés volver a iniciar sesión.' });
  });
}
