import type { JWT } from 'next-auth/jwt';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { RolUsuario } from '@prisma/client';

import { authorizeCredentials, type AuthorizedCredentialsUser } from '@/lib/auth-credentials';
import { prisma } from '@/lib/prisma';
import { configuredRateLimitStore, requestIpFromHeaderRecord } from '@/lib/rate-limit';
import { safeInternalCallbackUrl } from '@/lib/validation/auth';
import { twoFactorLoginCompleteSchema } from '@/lib/validation/auth';
import { getServerEnvironment } from '@/lib/validation/environment';
import { recordSecurityEvent } from '@/server/auth-security/security-event-repository';
import { loadCurrentAuthenticationState } from '@/server/auth/current-authentication-state';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';
import { ensureLoginSessionVersion } from '@/server/auth/session-version-login';
import { completeTwoFactorLogin } from '@/server/auth/two-factor-service';
import { hashAuthSecret } from '@/lib/auth-security';
import { type CurrentUser, type SessionUserAugmented } from '@/types/auth';

export { roleCanAccessPanel } from '@/lib/rbac';
export type { CurrentUser } from '@/types/auth';
export { currentUserInclude } from '@/types/auth';

type AuthenticationJwt = JWT & {
  authValid?: boolean;
  role?: string;
  tenantId?: string | null;
  sessionVersion?: number;
};

export const authOptions: NextAuthOptions = {
  secret: getServerEnvironment().NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === 'string'
          ? credentials.email.normalize('NFKC').trim().toLowerCase()
          : 'invalid';
        const store = configuredRateLimitStore();
        const ipRate = await store.consume(
          `login:ip:${requestIpFromHeaderRecord(request.headers ?? {})}`,
          AUTH_RATE_LIMIT_POLICIES.loginIp,
        );
        const identityRate = await store.consume(
          authIdentityRateLimitKey('login', email),
          AUTH_RATE_LIMIT_POLICIES.loginIdentity,
        );
        if (!ipRate.allowed || !identityRate.allowed) return null;
        const result = await authorizeCredentials(credentials, {
          findUser: (normalizedEmail) => prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            include: {
              authSessionVersion: true,
              twoFactorConfiguration: { select: { enabledAt: true, verifiedAt: true } },
              inmobiliariaPerfil: { select: { id: true } },
            },
          }),
          ensureSessionVersion: (userId) => ensureLoginSessionVersion(userId),
        });
        await recordSecurityEvent({
          userId: result?.id,
          type: result ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED',
          category: result ? 'credentials' : 'generic_credentials_failure',
        });
        return result;
      },
    }),
    Credentials({
      id: 'two-factor',
      name: 'Segundo factor',
      credentials: {
        challengeToken: { label: 'Challenge', type: 'text' },
        factor: { label: 'Factor', type: 'text' },
        code: { label: 'Código', type: 'text' },
      },
      async authorize(credentials, request) {
        const parsed = twoFactorLoginCompleteSchema.safeParse({
          challengeToken: credentials?.challengeToken,
          factor: credentials?.factor,
          code: credentials?.code,
        });
        if (!parsed.success) return null;
        const store = configuredRateLimitStore();
        const ipRate = await store.consume(
          `two-factor-login:ip:${requestIpFromHeaderRecord(request.headers ?? {})}`,
          AUTH_RATE_LIMIT_POLICIES.twoFactorLoginIp,
        );
        const challengeRate = await store.consume(
          `two-factor-login:challenge:${hashAuthSecret(parsed.data.challengeToken).slice(0, 32)}`,
          AUTH_RATE_LIMIT_POLICIES.twoFactorLoginChallenge,
        );
        if (!ipRate.allowed || !challengeRate.allowed) return null;
        const environment = getServerEnvironment();
        if (!environment.AUTH_ENCRYPTION_KEY) return null;
        return completeTwoFactorLogin(parsed.data, {
          client: prisma,
          encryptionKey: environment.AUTH_ENCRYPTION_KEY,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const authToken = token as AuthenticationJwt;
      if (user) {
        const authenticated = user as AuthorizedCredentialsUser;
        authToken.sessionVersion = authenticated.sessionVersion;
      }
      if (!token.sub || authToken.sessionVersion === undefined) {
        authToken.authValid = false;
        return authToken;
      }
      const state = await loadCurrentAuthenticationState(token.sub, authToken.sessionVersion);
      authToken.authValid = state !== null;
      if (state) {
        authToken.role = state.user.rol;
        authToken.tenantId = state.tenantId;
        authToken.name = state.user.nombre;
        authToken.picture = state.user.avatarUrl;
      }
      return authToken;
    },
    async session({ session, token }) {
      const authToken = token as AuthenticationJwt;
      if (!session.user || !authToken.authValid || !token.sub || authToken.sessionVersion === undefined) {
        session.user = undefined;
        return session;
      }
      const user = session.user as SessionUserAugmented;
      user.id = token.sub;
      user.role = authToken.role;
      user.tenantId = authToken.tenantId ?? null;
      user.sessionVersion = authToken.sessionVersion;
      return session;
    },
    async redirect({ url }) {
      const applicationUrl = getServerEnvironment().APP_URL;
      return new URL(safeInternalCallbackUrl(url, applicationUrl), applicationUrl).toString();
    },
  },
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUserAugmented | undefined;
  if (!sessionUser?.id || sessionUser.sessionVersion === undefined) return null;
  return (await loadCurrentAuthenticationState(sessionUser.id, sessionUser.sessionVersion))?.user ?? null;
}

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

export function assertNotPublicPortalUser(user: CurrentUser): void {
  if (user.rol === RolUsuario.USUARIO_NORMAL) {
    throw new AuthError(403, 'Las cuentas de usuario público no pueden acceder al panel.');
  }
}
