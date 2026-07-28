import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findVerificationTokenWithLegacyCompatibility, hashVerificationToken } from '@/lib/auth-verification';
import { verificationTokenSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const token = reqUrl.searchParams.get('token');

  const redirect = (path: string) => NextResponse.redirect(new URL(path, getServerEnvironment().APP_URL));

  const parsedToken = verificationTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return redirect('/login?error=invalid_or_expired_token');
  }

  const tokenHash = hashVerificationToken(parsedToken.data);
  const record = await findVerificationTokenWithLegacyCompatibility(parsedToken.data, {
    findByToken: (storedToken) => prisma.verificationToken.findUnique({ where: { token: storedToken } }),
    replaceToken: (id, storedToken) => prisma.verificationToken.update({
      where: { id },
      data: { token: storedToken },
    }),
  });

  if (!record) {
    return redirect('/login?error=invalid_or_expired_token');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
    return redirect('/login?error=invalid_or_expired_token');
  }

  const user = await prisma.user.findUnique({
    where: { email: record.email },
  });

  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
    return redirect('/login?error=invalid_or_expired_token');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { email: record.email } }),
  ]);

  return redirect('/login?verified=1');
}
