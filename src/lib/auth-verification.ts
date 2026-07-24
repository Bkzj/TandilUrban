import { createHash, randomBytes } from 'node:crypto';

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function issueVerificationToken(now = Date.now()): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(32).toString('base64url');
  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken),
    expiresAt: new Date(now + VERIFICATION_TOKEN_TTL_MS),
  };
}

export async function findVerificationTokenWithLegacyCompatibility<T extends { id: string }>(
  rawToken: string,
  store: {
    findByToken(token: string): Promise<T | null>;
    replaceToken(id: string, tokenHash: string): Promise<T>;
  },
): Promise<T | null> {
  const tokenHash = hashVerificationToken(rawToken);
  const hashed = await store.findByToken(tokenHash);
  if (hashed) return hashed;
  const legacy = await store.findByToken(rawToken);
  return legacy ? store.replaceToken(legacy.id, tokenHash) : null;
}
