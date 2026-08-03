import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { hashAuthSecret } from '@/lib/auth-security';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { AUTH_RATE_LIMIT_POLICIES } from '@/server/auth/rate-limit-policies';
import { getUserActiveSessions } from '@/server/auth/session-management-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return runRouteHandler(request, 'auth.sessions.list.failed', async () => {
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    const rate = await configuredRateLimitStore().consume(
      `session-list:user:${hashAuthSecret(identity.userId).slice(0, 32)}`,
      AUTH_RATE_LIMIT_POLICIES.sessionListUser,
    );
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    const [sessions, configuration] = await Promise.all([
      getUserActiveSessions({
        userId: identity.userId,
        sessionVersion: identity.sessionVersion,
        currentSessionId: identity.authSessionId,
      }, prisma),
      prisma.twoFactorConfiguration.findFirst({
        where: { userId: identity.userId, enabledAt: { not: null }, verifiedAt: { not: null } },
        select: { id: true },
      }),
    ]);
    return NextResponse.json({ sessions, requiresSecondFactor: Boolean(configuration) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  });
}
