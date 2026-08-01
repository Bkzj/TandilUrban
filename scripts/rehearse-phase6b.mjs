import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();
const migrationRoot = `${root}/database/migrations`;
const phase6bMigration = '20260801190000_phase6b_registration_verification_login';
const integrationOnly = process.argv.includes('--integration-only');
const container = `tandil-phase6b-${process.pid}-${randomBytes(3).toString('hex')}`;

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
    throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}`);
  }
  return result;
}

function docker(args, options = {}) { return run('docker', args, options); }
function createDatabase(name) { docker(['exec', container, 'createdb', '-U', 'postgres', name]); }
function url(name, port) { return `postgresql://postgres@127.0.0.1:${port}/${name}`; }
function sql(database, input, options = {}) {
  return docker(['exec', '-i', container, 'psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database], {
    input,
    capture: true,
    allowFailure: options.allowFailure,
  });
}
function prisma(args, databaseUrl, options = {}) {
  return run('npx', ['prisma', ...args], { ...options, env: { ...process.env, DATABASE_URL: databaseUrl } });
}
function waitForPostgres() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (docker(['exec', container, 'pg_isready', '-U', 'postgres'], { allowFailure: true, capture: true }).status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error('PostgreSQL 17 no quedó disponible');
}
function migrationNamesBefore6b() {
  return readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name < phase6bMigration)
    .map((entry) => entry.name)
    .sort();
}
function applyThrough6a(database) {
  for (const migration of migrationNamesBefore6b()) {
    sql(database, readFileSync(`${migrationRoot}/${migration}/migration.sql`, 'utf8'));
  }
}
function runIntegration(database, port) {
  const databaseUrl = url(database, port);
  run('npx', ['tsx', '--test', 'tests/integration/auth-phase6b-postgres.test.ts'], {
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl, PHASE6B_DATABASE_URL: databaseUrl },
  });
}

function emptyRehearsal(port) {
  const database = 'phase6b_empty';
  createDatabase(database);
  const databaseUrl = url(database, port);
  prisma(['migrate', 'deploy'], databaseUrl);
  const drift = prisma(['migrate', 'diff', '--exit-code', '--from-config-datasource', '--to-schema', 'database/schema.prisma'], databaseUrl, { capture: true });
  if (drift.status !== 0) throw new Error('Phase 6B detectó drift');
  const structure = sql(database, `
    SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='VerificationToken' AND column_name IN ('consumedAt','invalidatedAt');
    SELECT count(*) FROM pg_constraint WHERE conname='VerificationToken_terminal_state_check';
    SELECT count(*) FROM pg_indexes WHERE indexname='VerificationToken_userId_consumedAt_invalidatedAt_expiresAt_idx';
  `).stdout.trim();
  if (structure !== '2\n1\n1') throw new Error(`Estructura 6B inesperada: ${structure}`);
  runIntegration(database, port);
  process.stdout.write('phase6b rehearsal empty: 19 migrations, PostgreSQL integration and zero drift: ok\n');
}

const upgradeFixture = `
INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "emailVerifiedAt", activo, "createdAt", "updatedAt")
VALUES ('phase6b-owner', 'INMOBILIARIA', 'Titular Ficticio', 'owner-6b@example.invalid', '$2b$12$aaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', false, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "AuthSessionVersion" (id, "userId", version, "updatedAt") VALUES ('phase6b-version', 'phase6b-owner', 0, CURRENT_TIMESTAMP);
INSERT INTO "Inmobiliaria" (id, "userId", "nombreAgencia", cuit, direccion, "createdAt", "updatedAt") VALUES ('phase6b-tenant', 'phase6b-owner', 'Agencia Ficticia', '30-60000000-1', 'Calle Ficticia 600', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "Propiedad" (id, "inmobiliariaId", titulo, descripcion, estado, tipo, operacion, precio, moneda, direccion, latitud, longitud, "m2Total", "m2Cubiertos", ambientes, dormitorios, banos, cocheras, caracteristicas, imagenes, "createdAt", "updatedAt")
VALUES ('phase6b-property', 'phase6b-tenant', 'Casa de prueba 6B', 'Descripción ficticia y suficientemente extensa.', 'DISPONIBLE', 'Casa', 'VENTA', 100000.25, 'USD', 'Calle Ficticia 601', -37.32, -59.13, 100, 80, 3, 2, 1, 1, ARRAY['patio'], '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "Contacto" (id, nombre, email, mensaje, "propiedadId", "createdAt") VALUES ('phase6b-contact', 'Consulta Ficticia', 'contact-6b@example.invalid', 'Consulta ficticia suficientemente extensa.', 'phase6b-property', CURRENT_TIMESTAMP);
INSERT INTO "VerificationToken" (id, email, token, "expiresAt", "userId", "createdAt") VALUES ('phase6b-token', 'owner-6b@example.invalid', 'legacy-raw-compatible-token', CURRENT_TIMESTAMP + interval '1 day', 'phase6b-owner', CURRENT_TIMESTAMP);
`;
const snapshot = `
SELECT count(*) || ':' || min(id) || ':' || max("passwordHash") || ':' || max(rol::text) FROM "User";
SELECT count(*) || ':' || min(id) FROM "Inmobiliaria";
SELECT count(*) || ':' || min(id) || ':' || max(precio::text) || ':' || max(moneda::text) FROM "Propiedad";
SELECT count(*) || ':' || min(id) FROM "Contacto";
SELECT count(*) || ':' || min(id) || ':' || max(token) FROM "VerificationToken";
`;

function upgradeRehearsal() {
  const database = 'phase6b_upgrade';
  createDatabase(database);
  applyThrough6a(database);
  sql(database, upgradeFixture);
  const before = sql(database, snapshot).stdout;
  sql(database, readFileSync(`${migrationRoot}/${phase6bMigration}/preflight.sql`, 'utf8'));
  sql(database, readFileSync(`${migrationRoot}/${phase6bMigration}/migration.sql`, 'utf8'));
  if (sql(database, snapshot).stdout !== before) throw new Error('El upgrade 6B modificó datos existentes');
  const state = sql(database, 'SELECT "consumedAt" IS NULL AND "invalidatedAt" IS NULL FROM "VerificationToken" WHERE id=\'phase6b-token\';').stdout.trim();
  if (state !== 't') throw new Error('El token legacy no se preservó como pendiente');
  process.stdout.write('phase6b rehearsal upgrade: account, hash, role, tenant, business and legacy token data preserved: ok\n');
}

function rollbackRehearsal(port) {
  const database = 'phase6b_rollback';
  createDatabase(database);
  prisma(['migrate', 'deploy'], url(database, port));
  sql(database, readFileSync(`${migrationRoot}/${phase6bMigration}/rollback.sql`, 'utf8'));
  const columns = sql(database, `SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='VerificationToken' AND column_name IN ('consumedAt','invalidatedAt');`).stdout.trim();
  if (columns !== '0') throw new Error(`Rollback 6B incompleto: ${columns}`);
  process.stdout.write('phase6b rehearsal rollback: structural rollback verified; lifecycle history requires backup: ok\n');
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
    const database = 'phase6b_integration';
    createDatabase(database);
    prisma(['migrate', 'deploy'], url(database, port));
    runIntegration(database, port);
    process.stdout.write('phase6b PostgreSQL integration: ok\n');
  } else {
    emptyRehearsal(port);
    upgradeRehearsal();
    rollbackRehearsal(port);
  }
} finally {
  if (started) docker(['rm', '--force', container], { allowFailure: true, capture: true });
}
