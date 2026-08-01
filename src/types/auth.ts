import type { Prisma } from '@prisma/client';

/**
 * Include estándar para sesiones server-side:
 * - `inmobiliariaPerfil` (1-1) si el user es MAIN.
 * - `agencia` (N-1) si el user es AGENTE.
 */
export const currentUserInclude = {
  inmobiliariaPerfil: true,
  agencia: true,
} satisfies Prisma.UserInclude;

export type CurrentUser = Prisma.UserGetPayload<{ include: typeof currentUserInclude }>;

/** Campos extra que adjuntamos a `session.user` en callbacks JWT/session. */
export type SessionUserAugmented = {
  id?: string;
  role?: string;
  tenantId?: string | null;
  sessionVersion?: number;
};
