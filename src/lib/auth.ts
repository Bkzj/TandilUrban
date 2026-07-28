import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { RolUsuario } from '@prisma/client';

import { authorizeCredentials } from '@/lib/auth-credentials';
import { prisma } from '@/lib/prisma';
import { currentUserInclude, type CurrentUser, type SessionUserAugmented } from '@/types/auth';

export { roleCanAccessPanel } from '@/lib/rbac';

export type { CurrentUser } from '@/types/auth';
export { currentUserInclude } from '@/types/auth';

// =============================================================================
// NextAuth options (re-exportable para route handlers / server)
// =============================================================================

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contrasena', type: 'password' },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials, (email) => prisma.user.findUnique({ where: { email } }));
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as SessionUserAugmented;
        u.id = token.sub;
        u.role = token.role as string | undefined;
      }
      return session;
    },
  },
};

// =============================================================================
// Helpers de sesión / RBAC
// =============================================================================

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

/** Devuelve el `User` con relaciones de panel si hay sesión, o `null`. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: currentUserInclude,
  });
  return user?.activo ? user : null;
}

/**
 * `true` si el usuario es el administrador principal de una inmobiliaria:
 * - rol === 'INMOBILIARIA'
 * - posee Inmobiliaria 1-1 (`inmobiliariaPerfil`).
 */
export function isInmobiliariaMain(user: CurrentUser | null): boolean {
  return Boolean(user && user.rol === 'INMOBILIARIA' && user.inmobiliariaPerfil);
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 403 HTTP si es cuenta solo de portal público. */
export function assertNotPublicPortalUser(user: CurrentUser): void {
  if (user.rol === RolUsuario.USUARIO_NORMAL) {
    throw new AuthError(403, 'Las cuentas de usuario público no pueden acceder al panel.');
  }
}

/**
 * Garantiza que el usuario logueado es MAIN. Tira `AuthError` 401/403 si no.
 * Útil para endpoints (route handlers) — devuelve `inmobiliariaId` listo para queries.
 */
export async function requireInmobiliariaMain() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, 'Tenés que iniciar sesión.');
  }
  assertNotPublicPortalUser(user);
  if (!isInmobiliariaMain(user) || !user.inmobiliariaPerfil) {
    throw new AuthError(403, 'Solo el administrador de la inmobiliaria puede acceder.');
  }
  return {
    user,
    inmobiliaria: user.inmobiliariaPerfil,
    inmobiliariaId: user.inmobiliariaPerfil.id,
  };
}
