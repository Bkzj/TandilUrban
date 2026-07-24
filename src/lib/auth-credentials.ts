import { compare } from 'bcryptjs';

const DUMMY_PASSWORD_HASH =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx0W3IeqJZgJ6QXQ7VQ6E5xE5eK';

type CredentialsAccount = {
  passwordHash: string;
  emailVerifiedAt: Date | null;
};

type CredentialsUser = CredentialsAccount & {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  rol: string;
};

export async function isCredentialsLoginAllowed(
  account: CredentialsAccount | null,
  password: string,
): Promise<boolean> {
  const passwordValid = await compare(password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
  return Boolean(account && account.emailVerifiedAt !== null && passwordValid);
}

export async function authorizeCredentials(
  credentials: { email?: unknown; password?: unknown } | undefined,
  findUser: (email: string) => Promise<CredentialsUser | null>,
) {
  if (typeof credentials?.email !== 'string' || typeof credentials.password !== 'string') return null;
  const user = await findUser(credentials.email.trim().toLowerCase());
  const allowed = await isCredentialsLoginAllowed(user, credentials.password);
  if (!user || !allowed) return null;
  return {
    id: user.id,
    name: user.nombre,
    email: user.email,
    image: user.avatarUrl,
    role: user.rol,
  };
}
