import 'dotenv/config';

import { prisma } from '@/lib/prisma';
import { normalizedEmailSchema } from '@/lib/validation/common';
import { promoteExistingGlobalAdmin } from '@/server/admin/global-admin-promotion';

function localDatabaseDescription(): { host: string; database: string } {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL no está configurada.');
  const url = new URL(raw);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (!localHosts.has(url.hostname)) {
    throw new Error('La promoción sólo puede ejecutarse contra una base local explícita.');
  }
  return { host: url.hostname, database: decodeURIComponent(url.pathname.replace(/^\//u, '')) };
}

async function main() {
  const emailArgument = process.argv[2];
  const parsedEmail = normalizedEmailSchema.safeParse(emailArgument);
  if (!parsedEmail.success || process.argv.length !== 3) {
    throw new Error('Uso: npm run admin:promote -- <email>');
  }
  const database = localDatabaseDescription();
  process.stdout.write(`Base local confirmada: host=${database.host}, database=${database.database}\n`);

  const before = await prisma.user.findMany({ where: { email: { equals: parsedEmail.data, mode: 'insensitive' } }, select: { rol: true }, take: 2 });
  if (before.length !== 1 || !before[0]) throw new Error(before.length === 0 ? 'No existe una cuenta coincidente.' : 'La búsqueda es ambigua; no se modificó ninguna cuenta.');
  process.stdout.write(`Rol actual: ${before[0].rol}\n`);
  const result = await promoteExistingGlobalAdmin(parsedEmail.data, prisma);
  if (result.status === 'already_admin') {
    process.stdout.write('La cuenta ya es ADMIN; no se modificaron sesiones ni versión.\n');
    return;
  }
  process.stdout.write(`Promoción completada: rol=ADMIN, version=${result.version}, sesiones_revocadas=${result.revokedSessions}. Debe iniciar sesión nuevamente.\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Falló la promoción.'}\n`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
