import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();
const migrationRoot = `${root}/database/migrations`;
const phase6Migration = '20260729120000_phase6_authentication_security';
const container = `tandil-phase6a-${process.pid}-${randomBytes(3).toString('hex')}`;
const repositoriesOnly = process.argv.includes('--repositories-only');
const allowed = new Set(['--repositories-only']);
for (const argument of process.argv.slice(2)) {
  if (!allowed.has(argument)) throw new Error(`Argumento no reconocido: ${argument}`);
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

function docker(args, options = {}) {
  return run('docker', args, options);
}

function createDatabase(name) {
  docker(['exec', container, 'createdb', '-U', 'postgres', name]);
}

function databaseUrl(name, port) {
  return `postgresql://postgres@127.0.0.1:${port}/${name}`;
}

function executeSql(database, sql, options = {}) {
  return docker(
    ['exec', '-i', container, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '-At'],
    { input: sql, capture: true, allowFailure: options.allowFailure },
  );
}

function migrationNames(includePhase6) {
  return readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (includePhase6 || entry.name !== phase6Migration))
    .map((entry) => entry.name)
    .sort();
}

function applySqlMigrations(database, includePhase6) {
  for (const name of migrationNames(includePhase6)) {
    executeSql(database, readFileSync(`${migrationRoot}/${name}/migration.sql`, 'utf8'));
  }
}

function runPrisma(args, url, options = {}) {
  return run('npx', ['prisma', ...args], {
    ...options,
    env: { ...process.env, DATABASE_URL: url },
  });
}

function waitForPostgres() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const probe = docker(['exec', container, 'pg_isready', '-U', 'postgres'], { allowFailure: true, capture: true });
    if (probe.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error('PostgreSQL 17 no quedó disponible dentro del timeout');
}

const fixtureSql = `
INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "emailVerifiedAt", activo, "agenciaId", "createdAt", "updatedAt") VALUES
('owner-a', 'INMOBILIARIA', 'Titular A', 'owner-a@example.invalid', '$2b$12$aaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', false, CURRENT_TIMESTAMP, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('owner-b', 'INMOBILIARIA', 'Titular B', 'owner-b@example.invalid', '$2b$12$bbbbbbbbbbbbbbbbbbbbbbCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', false, CURRENT_TIMESTAMP, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('admin-a', 'ADMIN', 'Admin Prueba', 'admin@example.invalid', '$2b$12$ccccccccccccccccccccccDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', false, CURRENT_TIMESTAMP, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('normal-a', 'USUARIO_NORMAL', 'Usuario Prueba', 'normal@example.invalid', '$2b$12$eeeeeeeeeeeeeeeeeeeeeeFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', false, NULL, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('inactive-a', 'USUARIO_NORMAL', 'Usuario Inactivo', 'inactive@example.invalid', '$2b$12$ffffffffffffffffffffffGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', false, CURRENT_TIMESTAMP, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Inmobiliaria" (id, "userId", "nombreAgencia", cuit, direccion, "createdAt", "updatedAt") VALUES
('tenant-a', 'owner-a', 'Agencia Ficticia A', '30-00000001-1', 'Calle Ficticia 100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tenant-b', 'owner-b', 'Agencia Ficticia B', '30-00000002-2', 'Calle Ficticia 200', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "emailVerifiedAt", activo, "agenciaId", "createdAt", "updatedAt") VALUES
('agent-a', 'AGENTE', 'Agente Prueba', 'agent@example.invalid', '$2b$12$ddddddddddddddddddddddEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', false, CURRENT_TIMESTAMP, true, 'tenant-a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Propiedad" (id, "inmobiliariaId", "agenteId", titulo, descripcion, estado, tipo, operacion, precio, moneda, direccion, latitud, longitud, "m2Total", "m2Cubiertos", ambientes, dormitorios, banos, cocheras, caracteristicas, imagenes, "createdAt", "updatedAt") VALUES
('property-a', 'tenant-a', 'agent-a', 'Casa de prueba', 'Descripción sintética de propiedad válida.', 'DISPONIBLE', 'Casa', 'VENTA', 123456.78, 'USD', 'Calle Ficticia 123', -37.321, -59.133, 120, 90, 4, 2, 1, 1, ARRAY['patio'], '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Contacto" (id, nombre, email, mensaje, "propiedadId", "createdAt") VALUES
('contact-a', 'Contacto Prueba', 'contact@example.invalid', 'Consulta sintética suficientemente extensa.', 'property-a', CURRENT_TIMESTAMP);

INSERT INTO "VerificationToken" (id, email, token, "expiresAt", "userId", "createdAt") VALUES
('verify-a', 'normal@example.invalid', 'legacy-fixture-token', CURRENT_TIMESTAMP + interval '1 day', 'normal-a', CURRENT_TIMESTAMP);
`;

const snapshotSql = `
SELECT 'users=' || string_agg(id || ':' || rol::text || ':' || activo::text || ':' || "passwordHash" || ':' || coalesce("agenciaId", ''), ',' ORDER BY id) FROM "User";
SELECT 'tenants=' || string_agg(id || ':' || "userId", ',' ORDER BY id) FROM "Inmobiliaria";
SELECT 'properties=' || string_agg(id || ':' || "inmobiliariaId" || ':' || precio::text || ':' || moneda::text, ',' ORDER BY id) FROM "Propiedad";
SELECT 'contacts=' || string_agg(id || ':' || "propiedadId", ',' ORDER BY id) FROM "Contacto";
SELECT 'verification=' || string_agg(id || ':' || token || ':' || coalesce("userId", ''), ',' ORDER BY id) FROM "VerificationToken";
`;

function runRepositoryTests(database, port) {
  const url = databaseUrl(database, port);
  run('npx', ['tsx', '--test', 'tests/integration/auth-foundation-postgres.test.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: url,
      AUTH_FOUNDATION_DATABASE_URL: url,
    },
  });
}

function emptyRehearsal(port) {
  const database = 'phase6a_empty';
  createDatabase(database);
  const url = databaseUrl(database, port);
  runPrisma(['migrate', 'deploy'], url);
  runPrisma(['validate'], url);
  runPrisma(['generate'], url);
  const drift = runPrisma(
    ['migrate', 'diff', '--exit-code', '--from-config-datasource', '--to-schema', 'database/schema.prisma'],
    url,
    { capture: true },
  );
  if (drift.status !== 0) throw new Error('El rehearsal vacío detectó drift de Prisma');
  const structure = executeSql(database, `
    SELECT count(*) FROM pg_tables WHERE schemaname = current_schema() AND tablename IN
      ('AuthSessionVersion','PasswordResetToken','TwoFactorConfiguration','TwoFactorChallenge','TwoFactorRecoveryCode','SecurityEvent');
    SELECT count(*) FROM pg_constraint WHERE conname IN
      ('AuthSessionVersion_version_check','PasswordResetToken_expiry_check','TwoFactorConfiguration_parameters_check','TwoFactorChallenge_attempts_check');
    SELECT count(*) FROM pg_indexes WHERE schemaname = current_schema() AND indexname IN
      ('AuthSessionVersion_userId_key','PasswordResetToken_tokenHash_key','TwoFactorConfiguration_userId_key','TwoFactorChallenge_tokenHash_key','TwoFactorRecoveryCode_codeHash_key');
  `);
  if (structure.stdout.trim() !== '6\n4\n5') throw new Error(`Estructura Phase 6A inesperada: ${structure.stdout.trim()}`);
  runRepositoryTests(database, port);
  process.stdout.write('phase6a rehearsal empty: 18 migrations, constraints, indexes, repository concurrency and zero drift: ok\n');
}

function upgradeRehearsal() {
  const database = 'phase6a_upgrade';
  createDatabase(database);
  applySqlMigrations(database, false);
  const fixture = executeSql(database, fixtureSql, { allowFailure: true });
  if (fixture.status !== 0) {
    throw new Error(`El fixture representativo fue rechazado: ${fixture.stderr.trim().slice(0, 500)}`);
  }
  const before = executeSql(database, snapshotSql).stdout;
  executeSql(database, readFileSync(`${migrationRoot}/${phase6Migration}/preflight.sql`, 'utf8'));
  executeSql(database, readFileSync(`${migrationRoot}/${phase6Migration}/migration.sql`, 'utf8'));
  const after = executeSql(database, snapshotSql).stdout;
  if (before !== after) throw new Error('El rehearsal de upgrade modificó datos ajenos a autenticación');
  const versions = executeSql(database, 'SELECT count(*) || \':\' || min(version) || \':\' || max(version) FROM "AuthSessionVersion";').stdout.trim();
  if (versions !== '6:0:0') throw new Error(`Versionado inicial inesperado: ${versions}`);
  process.stdout.write('phase6a rehearsal upgrade: users, hashes, roles, tenants, property, contact, money and verification token preserved: ok\n');
}

function invalidLegacyRehearsal() {
  const database = 'phase6a_invalid_legacy';
  createDatabase(database);
  applySqlMigrations(database, false);
  const legacyFixture = executeSql(database, `
    INSERT INTO "User" (id, nombre, email, "passwordHash", "twoFactorEnabled", "twoFactorSecret", activo, "createdAt", "updatedAt")
    VALUES ('legacy-secret-user', 'Usuario Legacy', 'legacy@example.invalid', '$2b$12$syntheticSyntheticSyntheticSyntheticSyntheticSynthetic', true, 'fixture-secret-must-never-appear', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `, { allowFailure: true });
  if (legacyFixture.status !== 0) {
    throw new Error(`El fixture legacy fue rechazado: ${legacyFixture.stderr.trim().slice(0, 500)}`);
  }
  const preflight = executeSql(database, readFileSync(`${migrationRoot}/${phase6Migration}/preflight.sql`, 'utf8'), { allowFailure: true });
  const combined = `${preflight.stdout}\n${preflight.stderr}`;
  if (preflight.status === 0 || !combined.includes('PHASE6_PREFLIGHT: 1 user(s)')) {
    throw new Error('El preflight legacy no abortó con el conteo esperado');
  }
  if (combined.includes('fixture-secret-must-never-appear')) throw new Error('El preflight legacy expuso el secreto');
  const unchanged = executeSql(database, `SELECT to_regclass('"AuthSessionVersion"') IS NULL, count(*) FROM "User" WHERE id='legacy-secret-user';`).stdout.trim();
  if (unchanged !== 't|1') throw new Error(`El fixture legacy fue modificado: ${unchanged}`);
  process.stdout.write('phase6a rehearsal invalid legacy: expected preflight abort, count-only output and unchanged schema/data: ok\n');
}

function rollbackRehearsal(port) {
  const database = 'phase6a_rollback';
  createDatabase(database);
  const url = databaseUrl(database, port);
  runPrisma(['migrate', 'deploy'], url);
  const rollbackFixture = executeSql(database, `
    INSERT INTO "User" (id, nombre, email, "passwordHash", "twoFactorEnabled", activo, "createdAt", "updatedAt")
    VALUES ('rollback-user', 'Usuario Rollback', 'rollback@example.invalid', '$2b$12$syntheticSyntheticSyntheticSyntheticSyntheticSynthetic', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "AuthSessionVersion" (id, "userId", version, "updatedAt") VALUES ('rollback-version', 'rollback-user', 1, CURRENT_TIMESTAMP);
    INSERT INTO "PasswordResetToken" (id, "userId", "tokenHash", "expiresAt") VALUES ('rollback-reset', 'rollback-user', repeat('a', 64), CURRENT_TIMESTAMP + interval '1 hour');
    INSERT INTO "TwoFactorConfiguration" (id, "userId", "secretEncrypted", "enabledAt", "verifiedAt", "updatedAt") VALUES ('rollback-totp', 'rollback-user', 'v1.fixture.fixture.fixture', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "TwoFactorRecoveryCode" (id, "configurationId", "codeHash", "batchId") VALUES ('rollback-code', 'rollback-totp', repeat('b', 64), 'rollback-batch');
    INSERT INTO "SecurityEvent" (id, "userId", type) VALUES ('rollback-event', 'rollback-user', 'TWO_FACTOR_ENABLED');
  `, { allowFailure: true });
  if (rollbackFixture.status !== 0) {
    throw new Error(`El fixture de rollback fue rechazado: ${rollbackFixture.stderr.trim().slice(0, 500)}`);
  }
  executeSql(database, readFileSync(`${migrationRoot}/${phase6Migration}/rollback.sql`, 'utf8'));
  const result = executeSql(database, `
    SELECT count(*) FROM pg_tables WHERE schemaname=current_schema() AND tablename IN
      ('AuthSessionVersion','PasswordResetToken','TwoFactorConfiguration','TwoFactorChallenge','TwoFactorRecoveryCode','SecurityEvent');
    SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='User' AND column_name IN ('passwordChangedAt','lastSuccessfulLoginAt');
    SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='User' AND column_name IN ('twoFactorEnabled','twoFactorSecret');
  `).stdout.trim();
  if (result !== '0\n0\n2') throw new Error(`Rollback estructural inesperado: ${result}`);
  process.stdout.write('phase6a rehearsal rollback: structural removal verified; security data is destructive and requires backup restoration: ok\n');
}

let started = false;
try {
  docker(['run', '--detach', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', 'postgres:17-alpine'], { capture: true });
  started = true;
  waitForPostgres();
  const mapping = docker(['port', container, '5432/tcp'], { capture: true }).stdout.trim();
  const port = Number(mapping.slice(mapping.lastIndexOf(':') + 1));
  if (!Number.isInteger(port) || port <= 0) throw new Error('No se pudo resolver el puerto descartable de PostgreSQL');

  if (repositoriesOnly) {
    const database = 'phase6a_repositories';
    createDatabase(database);
    runPrisma(['migrate', 'deploy'], databaseUrl(database, port));
    runRepositoryTests(database, port);
    process.stdout.write('phase6a PostgreSQL repository suite: ok\n');
  } else {
    emptyRehearsal(port);
    upgradeRehearsal();
    invalidLegacyRehearsal();
    rollbackRehearsal(port);
  }
} finally {
  if (started) docker(['rm', '--force', container], { allowFailure: true, capture: true });
}
