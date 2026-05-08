import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const origin = reqUrl.origin;
  const token = reqUrl.searchParams.get('token');

  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (!token) {
    return redirect('/login?error=missing_token');
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    return redirect('/login?error=invalid_or_expired_token');
  }

  const user = await prisma.user.findUnique({
    where: { email: record.email },
  });

  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return redirect('/login?error=user_not_found');
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
