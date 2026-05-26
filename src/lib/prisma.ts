import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

/** Delegates que deben existir; si faltan, el singleton quedó de antes de `prisma generate`. */
const REQUIRED_DELEGATES = ['visitaFisicaEvento'] as const;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter });
}

function isStaleClient(client: PrismaClient): boolean {
  const record = client as PrismaClient & Record<string, unknown>;
  return REQUIRED_DELEGATES.some((key) => typeof record[key] === 'undefined');
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && !isStaleClient(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();