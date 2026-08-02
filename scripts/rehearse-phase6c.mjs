import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();
const migrationRoot = `${root}/database/migrations`;
const phase6cMigration = '20260802120000_phase6c_password_recovery';
const integrationOnly = process.argv.includes('--integration-only');
const container = `tandil-phase6c-${process.pid}-${randomBytes(3).toString('hex')}`;

for (const argument of process.argv.slice(2)) {
  if (argument !== '--integration-only') throw new Error(`Argumento no reconocido: ${argument}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: options.env ?? process.env,
    input: options.input,
    stdio: options.capture ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'],
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  }
  return result;
}

function docker(args, options = {}) { return run('docker', args, options); }
function createDatabase(name) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = docker(['exec', container, 'createdb', '-U', 'postgres', name], { allowFailure: true, capture: true });
    if (result.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error(`No se pudo crear la base descartable ${name}`);
}
function databaseUrl(name, port) { return `postgresql://postgres@127.0.0.1:${port}/${name}`; }
function sql(database, input, options = {}) {
  return docker(['exec', '-i', container, 'psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database], {
    input,
    capture: true,
    allowFailure: options.allowFailure,
  });
}
function prisma(args, url, options = {}) {
  return run('npx', ['prisma', ...args], { ...options, env: { ...process.env, DATABASE_URL: url } });
}
function waitForPostgres() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (docker(['exec', container, 'pg_isready', '-U', 'postgres'], { allowFailure: true, capture: true }).status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error('PostgreSQL 17 no quedó disponible');
}
function migrationsBefore6c() {
  return readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name < phase6cMigration)
    .map((entry) => entry.name)
    .sort();
}
function applyBefore6c(database) {
  for (const migration of migrationsBefore6c()) {
    sql(database, readFileSync(`${migrationRoot}/${migration}/migration.sql`, 'utf8'));
  }
}
function runIntegration(database, port) {
  const url = databaseUrl(database, port);
  run('npx', ['tsx', '--test', 'tests/integration/auth-phase6c-postgres.test.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: url,
      PHASE6C_DATABASE_URL: url,
      APP_URL: 'http://localhost:3000',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: randomBytes(48).toString('base64url'),
      AUTH_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    },
  });
}

function emptyRehearsal(port) {
  const database = 'phase6c_empty';
  createDatabase(database);
  const url = databaseUrl(database, port);
  prisma(['migrate', 'deploy'], url);
  const drift = prisma(['migrate', 'diff', '--exit-code', '--from-config-datasource', '--to-schema', 'database/schema.prisma'], url, { capture: true });
  if (drift.status !== 0) throw new Error(`Phase 6C detectó drift: ${drift.stdout}${drift.stderr}`);
  const structure = sql(database, `
    SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('PASSWORD_RESET_COMPLETED','PASSWORD_CHANGE_FAILED');
    SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname IN ('PasswordResetToken_tokenHash_key','PasswordResetToken_userId_expiresAt_idx');
    SELECT count(*) FROM pg_constraint WHERE conname IN ('PasswordResetToken_userId_fkey','AuthSessionVersion_userId_fkey');
  `).stdout.trim();
  if (structure !== '2\n2\n2') throw new Error(`Estructura Phase 6C inesperada: ${structure}`);
  runIntegration(database, port);
  process.stdout.write('phase6c rehearsal empty: 20 migrations, constraints, concurrency and zero drift: ok\n');
}

const upgradeFixture = `
INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "emailVerifiedAt", activo, "createdAt", "updatedAt")
VALUES ('phase6c-owner', 'INMOBILIARIA', 'Titular Ficticio 6C', 'owner-6c@example.invalid', '$2b$12$aaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', false, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "AuthSessionVersion" (id, "userId", version, "updatedAt") VALUES ('phase6c-version', 'phase6c-owner', 4, CURRENT_TIMESTAMP);
INSERT INTO "Inmobiliaria" (id, "userId", "nombreAgencia", cuit, direccion, "createdAt", "updatedAt") VALUES ('phase6c-tenant', 'phase6c-owner', 'Agencia Ficticia 6C', '30-66000000-1', 'Calle Ficticia 660', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "Propiedad" (id, "inmobiliariaId", titulo, descripcion, estado, tipo, operacion, precio, moneda, direccion, latitud, longitud, "m2Total", "m2Cubiertos", ambientes, dormitorios, banos, cocheras, caracteristicas, imagenes, "createdAt", "updatedAt")
VALUES ('phase6c-property', 'phase6c-tenant', 'Casa ficticia 6C', 'Descripción ficticia suficientemente extensa.', 'DISPONIBLE', 'Casa', 'VENTA', 123456.78, 'USD', 'Calle Ficticia 661', -37.32, -59.13, 100, 80, 3, 2, 1, 1, ARRAY['patio'], '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "Contacto" (id, nombre, email, mensaje, "propiedadId", "createdAt") VALUES ('phase6c-contact', 'Consulta Ficticia', 'contact-6c@example.invalid', 'Consulta ficticia suficientemente extensa.', 'phase6c-property', CURRENT_TIMESTAMP);
INSERT INTO "PasswordResetToken" (id, "userId", "tokenHash", "expiresAt", "createdAt") VALUES ('phase6c-reset', 'phase6c-owner', repeat('a',64), CURRENT_TIMESTAMP + interval '30 minutes', CURRENT_TIMESTAMP);
`;
const snapshot = `
SELECT count(*) || ':' || min(id) || ':' || max("passwordHash") || ':' || max(rol::text) FROM "User";
SELECT count(*) || ':' || min(id) FROM "Inmobiliaria";
SELECT count(*) || ':' || min(id) || ':' || max(precio::text) || ':' || max(moneda::text) FROM "Propiedad";
SELECT count(*) || ':' || min(id) FROM "Contacto";
SELECT count(*) || ':' || min("tokenHash") || ':' || bool_and("consumedAt" IS NULL)::text FROM "PasswordResetToken";
SELECT count(*) || ':' || min(version)::text FROM "AuthSessionVersion";
`;

function upgradeRehearsal() {
  const database = 'phase6c_upgrade';
  createDatabase(database);
  applyBefore6c(database);
  sql(database, upgradeFixture);
  const before = sql(database, snapshot).stdout;
  sql(database, readFileSync(`${migrationRoot}/${phase6cMigration}/preflight.sql`, 'utf8'));
  sql(database, readFileSync(`${migrationRoot}/${phase6cMigration}/migration.sql`, 'utf8'));
  if (sql(database, snapshot).stdout !== before) throw new Error('El upgrade 6C modificó identidad o datos de negocio');
  process.stdout.write('phase6c rehearsal upgrade: password hash, role, tenant, property, contact, money, reset token and session version preserved: ok\n');
}

function invalidPreflightRehearsal() {
  const database = 'phase6c_invalid';
  createDatabase(database);
  applyBefore6c(database);
  sql(database, upgradeFixture.replace("repeat('a',64)", "'malformed-hash-fixture'"));
  const result = sql(database, readFileSync(`${migrationRoot}/${phase6cMigration}/preflight.sql`, 'utf8'), { allowFailure: true });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status === 0 || !output.includes('malformed reset token hashes: 1 row(s)')) throw new Error('El preflight inválido no abortó como se esperaba');
  if (output.includes('malformed-hash-fixture')) throw new Error('El preflight imprimió el valor sensible');
  const enumCount = sql(database, `SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel='PASSWORD_RESET_COMPLETED';`).stdout.trim();
  if (enumCount !== '0') throw new Error('La migración se aplicó pese al preflight fallido');
  process.stdout.write('phase6c rehearsal invalid fixture: preflight failed safely without value disclosure or DDL: ok\n');
}

function rollbackRehearsal(port) {
  const database = 'phase6c_rollback';
  createDatabase(database);
  prisma(['migrate', 'deploy'], databaseUrl(database, port));
  sql(database, readFileSync(`${migrationRoot}/${phase6cMigration}/rollback.sql`, 'utf8'));
  const enumCount = sql(database, `SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('PASSWORD_RESET_COMPLETED','PASSWORD_CHANGE_FAILED');`).stdout.trim();
  if (enumCount !== '0') throw new Error('Rollback 6C no eliminó los valores estructurales');
  process.stdout.write('phase6c rehearsal rollback: structural rollback verified; security events require backup restoration: ok\n');
}

let started = false;
try {
  docker(['run', '--detach', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', 'postgres:17-alpine'], { capture: true });
  started = true;
  waitForPostgres();
  const mapping = docker(['port', container, '5432/tcp'], { capture: true }).stdout.trim();
  const port = Number(mapping.slice(mapping.lastIndexOf(':') + 1));
  if (!Number.isInteger(port) || port < 1) throw new Error('Puerto PostgreSQL inválido');
  if (integrationOnly) {
    const database = 'phase6c_integration';
    createDatabase(database);
    prisma(['migrate', 'deploy'], databaseUrl(database, port));
    runIntegration(database, port);
    process.stdout.write('phase6c PostgreSQL integration: ok\n');
  } else {
    emptyRehearsal(port);
    upgradeRehearsal();
    invalidPreflightRehearsal();
    rollbackRehearsal(port);
  }
} finally {
  if (started) docker(['rm', '--force', container], { allowFailure: true, capture: true });
}
