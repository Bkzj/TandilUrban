import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { requireGlobalAdmin } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { runRouteHandler } from '@/lib/route-handler';
import { accountStatusSchema } from '@/lib/validation/admin';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { AdministrativePolicyError, setManagedAccountActive } from '@/server/admin/admin-management-service';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';

export async function PATCH(request: Request) {
  return runRouteHandler(request, 'admin.account_status.failed', async (requestId) => {
    assertTrustedMutationRequest(request);
    const { user } = await requireGlobalAdmin();
    const rate = await configuredRateLimitStore().consume(`admin-mutation:user:${hashAuthSecret(user.id).slice(0, 32)}`, AUTH_RATE_LIMIT_POLICIES.adminMutationUser);
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const payload = await parseJsonBody(request, accountStatusSchema, REQUEST_LIMITS.authJsonBytes);
    try {
      const result = await setManagedAccountActive({ actorUserId: user.id, targetUserId: payload.userId, activo: payload.activo }, { client: prisma, requestId });
      return NextResponse.json({ ok: true, changed: result.changed });
    } catch (error) {
      if (error instanceof AdministrativePolicyError) throw new ApiError(error.code, { message: error.message });
      throw error;
    }
  });
}
