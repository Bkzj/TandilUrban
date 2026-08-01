import { NextResponse } from 'next/server';

import { runRouteHandler } from '@/lib/route-handler';
import { verificationTokenSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { verifyEmailToken } from '@/server/auth/verification-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  return runRouteHandler(request, 'auth.verification.failed', async (requestId) => {
    const token = new URL(request.url).searchParams.get('token');
    const parsedToken = verificationTokenSchema.safeParse(token);
    const base = getServerEnvironment().APP_URL;
    if (!parsedToken.success) {
      return NextResponse.redirect(new URL('/verificar-cuenta?status=invalid', base));
    }
    const result = await verifyEmailToken(parsedToken.data, { client: prisma, requestId });
    return NextResponse.redirect(
      new URL(
        result.status === 'verified'
          ? '/verificar-cuenta?status=success'
          : '/verificar-cuenta?status=invalid',
        base,
      ),
    );
  });
}
