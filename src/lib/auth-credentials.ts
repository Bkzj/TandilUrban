import { compare } from 'bcryptjs';

import { credentialsSchema } from '@/lib/validation/auth';

const DUMMY_PASSWORD_HASH =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx0W3IeqJZgJ6QXQ7VQ6E5xE5eK';

type CredentialsAccount = {
  passwordHash: string;
  emailVerifiedAt: Date | null;
  activo: boolean;
  twoFactorEnabled?: boolean;
  authSessionVersion?: { version: number } | null;
  twoFactorConfiguration?: { enabledAt: Date | null; verifiedAt: Date | null } | null;
};

export type CredentialsUser = CredentialsAccount & {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  rol: string;
  agenciaId: string | null;
  inmobiliariaPerfil: { id: string } | null;
};

export type AuthorizedCredentialsUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  tenantId: string | null;
  sessionVersion: number;
};

export async function isCredentialsLoginAllowed(
  account: CredentialsAccount | null,
  password: string,
): Promise<boolean> {
  const passwordValid = await compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const secondFactorEnabled = Boolean(
    account?.twoFactorEnabled ||
    (account?.twoFactorConfiguration?.enabledAt && account.twoFactorConfiguration.verifiedAt),
  );
  return Boolean(
    account &&
    account.activo &&
    account.emailVerifiedAt !== null &&
    !secondFactorEnabled &&
    passwordValid
  );
}

export async function authorizeCredentials(
  credentials: Readonly<Record<string, unknown>> | undefined,
  dependencies: {
    findUser(email: string): Promise<CredentialsUser | null>;
    ensureSessionVersion(userId: string): Promise<number>;
  },
): Promise<AuthorizedCredentialsUser | null> {
  const parsed = credentialsSchema.safeParse({
    email: credentials?.email,
    password: credentials?.password,
  });
  if (!parsed.success) return null;
  const user = await dependencies.findUser(parsed.data.email);
  const allowed = await isCredentialsLoginAllowed(user, parsed.data.password);
  if (!user || !allowed) return null;
  const sessionVersion = user.authSessionVersion?.version
    ?? await dependencies.ensureSessionVersion(user.id);
  const tenantId = user.rol === 'INMOBILIARIA'
    ? user.inmobiliariaPerfil?.id ?? null
    : user.rol === 'AGENTE'
      ? user.agenciaId
      : null;
  return {
    id: user.id,
    name: user.nombre,
    email: user.email,
    image: user.avatarUrl,
    role: user.rol,
    tenantId,
    sessionVersion,
  };
}
