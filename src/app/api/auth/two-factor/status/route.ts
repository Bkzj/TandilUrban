import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { currentSessionIdentity } from '@/server/auth/session-identity';
import { getTwoFactorStatus } from '@/server/auth/two-factor-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return runRouteHandler(request, 'auth.two_factor_status.failed', async () => {
    const identity = await currentSessionIdentity();
    if (!identity) throw new ApiError('UNAUTHORIZED');
    return NextResponse.json(await getTwoFactorStatus(identity.userId, identity.sessionVersion, prisma), {
      headers: { 'Cache-Control': 'no-store' },
    });
  });
}
