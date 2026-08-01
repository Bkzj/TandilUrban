import { hash } from 'bcryptjs';
import { Prisma, RolUsuario, type PrismaClient } from '@/generated/prisma';

import { issueVerificationToken, VERIFICATION_TOKEN_TTL_MS } from '@/lib/auth-verification';
import { type AuthEmailAdapter, sendVerificationEmail } from '@/lib/mail';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';

export const PUBLIC_REGISTRATION_MESSAGE =
  'Si los datos son válidos, recibirás un correo para continuar.';

type RegistrationInput = {
  nombre: string;
  email: string;
  password: string;
};

export type RegistrationResult = {
  accepted: true;
  accountCreated: boolean;
  deliveryAttempted: boolean;
  deliverySucceeded: boolean;
};

export async function registerPublicAccount(
  input: RegistrationInput,
  options: {
    client: PrismaClient;
    emailAdapter?: AuthEmailAdapter;
    requestId?: string;
    now?: Date;
    verificationTtlMs?: number;
  },
): Promise<RegistrationResult> {
  const now = options.now ?? new Date();
  const normalizedEmail = input.email.normalize('NFKC').trim().toLowerCase();
  const verificationTtlMs = options.verificationTtlMs ?? VERIFICATION_TOKEN_TTL_MS;
  const passwordHash = await hash(input.password, 12);
  const issued = issueVerificationToken(now.getTime(), verificationTtlMs);
  let created: { id: string; email: string } | null = null;

  try {
    created = await options.client.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) return null;

      const user = await tx.user.create({
        data: {
          nombre: input.nombre,
          email: normalizedEmail,
          passwordHash,
          rol: RolUsuario.USUARIO_NORMAL,
          activo: true,
          emailVerifiedAt: null,
          twoFactorEnabled: false,
          authSessionVersion: { create: { version: 0 } },
          verificationTokens: {
            create: {
              email: normalizedEmail,
              token: issued.tokenHash,
              expiresAt: issued.expiresAt,
            },
          },
        },
        select: { id: true, email: true },
      });
      await recordSecurityEvent(
        { userId: user.id, type: 'REGISTRATION', requestId: options.requestId },
        tx,
      );
      await recordSecurityEvent(
        { userId: user.id, type: 'SESSION_VERSION_INITIALIZED', requestId: options.requestId },
        tx,
      );
      await recordSecurityEvent(
        { userId: user.id, type: 'VERIFICATION_REQUESTED', requestId: options.requestId },
        tx,
      );
      return user;
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      !['P2002', 'P2034'].includes(error.code)
    ) {
      throw error;
    }
  }

  if (!created) {
    return { accepted: true, accountCreated: false, deliveryAttempted: false, deliverySucceeded: false };
  }
  const delivery = options.emailAdapter
    ? await sendVerificationEmail(created.email, issued.rawToken, options.emailAdapter, verificationTtlMs / 3_600_000)
    : await sendVerificationEmail(created.email, issued.rawToken, undefined, verificationTtlMs / 3_600_000);
  return {
    accepted: true,
    accountCreated: true,
    deliveryAttempted: true,
    deliverySucceeded: delivery.ok && delivery.delivered,
  };
}
