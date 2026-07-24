import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type Bucket = { count: number; resetAt: number };
export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };
export type RateLimitStore = {
  consume(key: string, policy: RateLimitPolicy, now?: number): Promise<RateLimitResult>;
};

export function createMemoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>();
  return {
    async consume(key, policy, now = Date.now()) {
      for (const [storedKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(storedKey);
      }
      const current = buckets.get(key);
      const bucket = !current ? { count: 0, resetAt: now + policy.windowMs } : current;
      bucket.count += 1;
      buckets.set(key, bucket);
      return {
        allowed: bucket.count <= policy.limit,
        remaining: Math.max(0, policy.limit - bucket.count),
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    },
  };
}

export const postgresRateLimitStore: RateLimitStore = {
  async consume(key, policy, now = Date.now()) {
    const current = new Date(now);
    const nextExpiry = new Date(now + policy.windowMs);
    const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt", "updatedAt")
      VALUES (${key}, 1, ${nextExpiry}, ${current})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${current} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${current} THEN ${nextExpiry} ELSE "RateLimitBucket"."expiresAt" END,
        "updatedAt" = ${current}
      RETURNING "count", "expiresAt"
    `);
    await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: current }, key: { not: key } } });
    const row = rows[0];
    if (!row) throw new Error('No se pudo registrar el límite de solicitudes.');
    return {
      allowed: row.count <= policy.limit,
      remaining: Math.max(0, policy.limit - row.count),
      retryAfterSeconds: Math.max(1, Math.ceil((row.expiresAt.getTime() - now) / 1000)),
    };
  },
};

const localMemoryStore = createMemoryRateLimitStore();

export function configuredRateLimitStore(): RateLimitStore {
  if (process.env.RATE_LIMIT_BACKEND === 'memory' && process.env.NODE_ENV !== 'production') {
    return localMemoryStore;
  }
  return postgresRateLimitStore;
}

const TRUSTED_PROXY_HEADERS = new Set(['x-vercel-forwarded-for', 'cf-connecting-ip']);

export function requestIp(
  request: Request,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = env.RATE_LIMIT_TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (!configured || !TRUSTED_PROXY_HEADERS.has(configured)) return 'unknown';
  const value = request.headers.get(configured)?.split(',')[0]?.trim();
  return value && /^[0-9a-f:.]{3,45}$/i.test(value) ? value : 'unknown';
}
