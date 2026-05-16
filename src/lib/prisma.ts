import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

// 2. Creamos un "Pool" (un gestor que mantiene vivas las conexiones a PostgreSQL)
const pool = new Pool({ connectionString });

// 3. Le pasamos ese gestor al adaptador oficial de Prisma
const adapter = new PrismaPg(pool);

// 4. Inicializamos Prisma, pero ahora le pasamos el adaptador (el requisito de Prisma 7)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

/** En dev el singleton puede quedar desfasado tras `prisma generate` o cambios de schema: reiniciá el servidor. */
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;