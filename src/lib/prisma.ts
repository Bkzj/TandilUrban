import { Prisma, PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

type PrismaGlobal = {
  prisma?: PrismaClient;
  /** Invalida el singleton cuando cambia el schema (dev hot-reload). */
  prismaSchemaMarker?: string;
};

const globalForPrisma = global as unknown as PrismaGlobal;

/** Delegates que deben existir; si faltan, el singleton quedó de antes de `prisma generate`. */
const REQUIRED_DELEGATES = ['visitaFisicaEvento'] as const;

/** Campos escalares requeridos en Propiedad; si faltan en el client generado, regenerar. */
const REQUIRED_PROPIEDAD_FIELDS = ['esExclusiva'] as const;

/**
 * Marcador derivado del schema generado. Cambia solo cuando el client incluye
 * los campos/delegates requeridos arriba.
 */
const CLIENT_SCHEMA_MARKER = [
  ...REQUIRED_DELEGATES,
  ...REQUIRED_PROPIEDAD_FIELDS.filter((f) => f in Prisma.PropiedadScalarFieldEnum),
].join('|');

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter });
}

function isStaleClient(client: PrismaClient | undefined, marker: string | undefined): boolean {
  if (!client) return true;
  if (marker !== CLIENT_SCHEMA_MARKER) return true;

  const record = client as PrismaClient & Record<string, unknown>;
  return REQUIRED_DELEGATES.some((key) => typeof record[key] === 'undefined');
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && !isStaleClient(cached, globalForPrisma.prismaSchemaMarker)) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaMarker = CLIENT_SCHEMA_MARKER;
  }
  return client;
}

export const prisma = getPrismaClient();