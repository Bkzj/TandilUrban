import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { currentUserInclude, type CurrentUser, type SessionUserAugmented } from '@/types/auth';

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
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
        });
        if (!user) return null;

        const passwordValido = await compare(String(credentials.password), user.passwordHash);
        if (!passwordValido) return null;

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          image: user.avatarUrl ?? null,
          role: user.rol,
        };
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

/** Devuelve el `User` con relaciones de panel si hay sesión, o `null`. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: currentUserInclude,
  });
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

/**
 * Garantiza que el usuario logueado es MAIN. Tira `AuthError` 401/403 si no.
 * Útil para endpoints (route handlers) — devuelve `inmobiliariaId` listo para queries.
 */
export async function requireInmobiliariaMain() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, 'Tenés que iniciar sesión.');
  }
  if (!isInmobiliariaMain(user) || !user.inmobiliariaPerfil) {
    throw new AuthError(403, 'Solo el administrador de la inmobiliaria puede acceder.');
  }
  return {
    user,
    inmobiliaria: user.inmobiliariaPerfil,
    inmobiliariaId: user.inmobiliariaPerfil.id,
  };
}
