import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();
const migrationRoot = `${root}/database/migrations`;
const phase6d = '20260803120000_phase6d_two_factor_authentication';
const integrationOnly = process.argv.includes('--integration-only');
const container = `tandil-phase6d-${process.pid}-${randomBytes(3).toString('hex')}`;
for (const argument of process.argv.slice(2)) if (argument !== '--integration-only') throw new Error(`Argumento no reconocido: ${argument}`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: options.env ?? process.env, input: options.input, stdio: options.capture ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'] });
  if (!options.allowFailure && result.status !== 0) throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  return result;
}
function docker(args, options = {}) { return run('docker', args, options); }
function sql(database, input, options = {}) { return docker(['exec', '-i', container, 'psql', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database], { input, capture: true, allowFailure: options.allowFailure }); }
function url(database, port) { return `postgresql://postgres@127.0.0.1:${port}/${database}`; }
function createDatabase(name) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (docker(['exec', container, 'createdb', '-U', 'postgres', name], { allowFailure: true, capture: true }).status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error(`No se pudo crear ${name}`);
}
function prisma(args, databaseUrl, options = {}) { return run('npx', ['prisma', ...args], { ...options, env: { ...process.env, DATABASE_URL: databaseUrl } }); }
function applyBefore6d(database) {
  for (const name of readdirSync(migrationRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name < phase6d).map((entry) => entry.name).sort()) {
    sql(database, readFileSync(`${migrationRoot}/${name}/migration.sql`, 'utf8'));
  }
}
function runIntegration(database, port) {
  const databaseUrl = url(database, port);
  run('npx', ['tsx', '--test', 'tests/integration/auth-phase6d-postgres.test.ts'], { env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl, PHASE6D_DATABASE_URL: databaseUrl, NEXTAUTH_URL: 'http://localhost:3000', NEXTAUTH_SECRET: randomBytes(48).toString('base64url'), APP_URL: 'http://localhost:3000', AUTH_ENCRYPTION_KEY: randomBytes(32).toString('base64') } });
}

function empty(port) {
  createDatabase('phase6d_empty');
  const databaseUrl = url('phase6d_empty', port);
  prisma(['migrate', 'deploy'], databaseUrl);
  const drift = prisma(['migrate', 'diff', '--exit-code', '--from-config-datasource', '--to-schema', 'database/schema.prisma'], databaseUrl, { capture: true });
  if (drift.status !== 0) throw new Error(`Drift 6D: ${drift.stdout}${drift.stderr}`);
  const structure = sql('phase6d_empty', `
    SELECT count(*) FROM information_schema.columns WHERE table_name='TwoFactorChallenge' AND column_name='sessionVersion';
    SELECT count(*) FROM pg_constraint WHERE conname='TwoFactorChallenge_session_version_check';
    SELECT count(*) FROM pg_indexes WHERE indexname='TwoFactorChallenge_userId_sessionVersion_expiresAt_idx';
    SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('TWO_FACTOR_SETUP_STARTED','TWO_FACTOR_CHALLENGE_FAILED','TWO_FACTOR_CHALLENGE_COMPLETED','RECOVERY_CODE_LOGIN_SUCCEEDED','RECOVERY_CODE_LOGIN_FAILED');
  `).stdout.trim();
  if (structure !== '1\n1\n1\n5') throw new Error(`Estructura 6D inesperada: ${structure}`);
  runIntegration('phase6d_empty', port);
  process.stdout.write('phase6d empty: 21 migrations, constraints, concurrency and zero drift: ok\n');
}

const fixture = `
INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "twoFactorSecret", "emailVerifiedAt", activo, "createdAt", "updatedAt") VALUES
('phase6d-owner','INMOBILIARIA','Titular Ficticio','owner-6d@example.invalid','$2b$12$aaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',false,NULL,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('phase6d-user','USUARIO_NORMAL','Persona Ficticia','user-6d@example.invalid','$2b$12$ccccccccccccccccccccccDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',false,NULL,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "AuthSessionVersion" (id,"userId",version,"updatedAt") VALUES ('phase6d-v1','phase6d-owner',2,CURRENT_TIMESTAMP),('phase6d-v2','phase6d-user',0,CURRENT_TIMESTAMP);
INSERT INTO "Inmobiliaria" (id,"userId","nombreAgencia",cuit,direccion,"createdAt","updatedAt") VALUES ('phase6d-tenant','phase6d-owner','Agencia 6D','30-68000000-1','Calle Ficticia 680',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "Propiedad" (id,"inmobiliariaId",titulo,descripcion,estado,tipo,operacion,precio,moneda,direccion,latitud,longitud,"m2Total","m2Cubiertos",ambientes,dormitorios,banos,cocheras,caracteristicas,imagenes,"createdAt","updatedAt") VALUES ('phase6d-property','phase6d-tenant','Casa 6D','Descripción ficticia suficientemente extensa.','DISPONIBLE','Casa','VENTA',98765.43,'USD','Calle Ficticia 681',-37.32,-59.13,100,80,3,2,1,1,ARRAY['patio'],'[]'::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "TwoFactorConfiguration" (id,"userId","secretEncrypted",algorithm,digits,"periodSeconds","enabledAt","verifiedAt","createdAt","updatedAt") VALUES ('phase6d-config','phase6d-user','v1.synthetic.synthetic.synthetic','SHA1',6,30,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "TwoFactorRecoveryCode" (id,"configurationId","codeHash","batchId","createdAt") VALUES ('phase6d-code','phase6d-config',repeat('a',64),'phase6d-batch',CURRENT_TIMESTAMP);
INSERT INTO "TwoFactorChallenge" (id,"userId","tokenHash","expiresAt",attempts,"maxAttempts",purpose,"createdAt") VALUES ('phase6d-challenge','phase6d-user',repeat('b',64),CURRENT_TIMESTAMP + interval '5 minutes',0,5,'LOGIN',CURRENT_TIMESTAMP);
`;
const snapshot = `SELECT count(*)||':'||min(id)||':'||max("passwordHash")||':'||max(rol::text) FROM "User";
SELECT count(*)||':'||min(id) FROM "Inmobiliaria";
SELECT count(*)||':'||min(id)||':'||max(precio::text)||':'||max(moneda::text) FROM "Propiedad";
SELECT count(*)||':'||min("secretEncrypted") FROM "TwoFactorConfiguration";
SELECT count(*)||':'||min("codeHash") FROM "TwoFactorRecoveryCode";
SELECT count(*)||':'||min("tokenHash") FROM "TwoFactorChallenge";
SELECT count(*)||':'||min(version)::text FROM "AuthSessionVersion";`;

function upgrade() {
  createDatabase('phase6d_upgrade'); applyBefore6d('phase6d_upgrade'); sql('phase6d_upgrade', fixture);
  const before = sql('phase6d_upgrade', snapshot).stdout;
  sql('phase6d_upgrade', readFileSync(`${migrationRoot}/${phase6d}/preflight.sql`, 'utf8'));
  sql('phase6d_upgrade', readFileSync(`${migrationRoot}/${phase6d}/migration.sql`, 'utf8'));
  if (sql('phase6d_upgrade', snapshot).stdout !== before) throw new Error('Upgrade 6D modificó datos existentes');
  if (sql('phase6d_upgrade', 'SELECT "sessionVersion" FROM "TwoFactorChallenge" WHERE id=\'phase6d-challenge\';').stdout.trim() !== '0') throw new Error('Challenge legacy no fue inicializado');
  process.stdout.write('phase6d upgrade: identity, bcrypt, tenant, business, TOTP, recovery and challenge data preserved: ok\n');
}

function invalid() {
  createDatabase('phase6d_invalid'); applyBefore6d('phase6d_invalid');
  sql('phase6d_invalid', fixture.replace("false,NULL,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);", "false,'legacy-sensitive-fixture',CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);") );
  const result = sql('phase6d_invalid', readFileSync(`${migrationRoot}/${phase6d}/preflight.sql`, 'utf8'), { allowFailure: true });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status === 0 || !output.includes('legacy two-factor secrets: 1 row(s)')) throw new Error('Preflight 6D no abortó');
  if (output.includes('legacy-sensitive-fixture')) throw new Error('Preflight 6D expuso el secreto');
  if (sql('phase6d_invalid', `SELECT count(*) FROM information_schema.columns WHERE table_name='TwoFactorChallenge' AND column_name='sessionVersion';`).stdout.trim() !== '0') throw new Error('Hubo DDL tras preflight fallido');
  process.stdout.write('phase6d invalid legacy fixture: safe preflight abort without DDL or secret disclosure: ok\n');
}

function rollback(port) {
  createDatabase('phase6d_rollback'); prisma(['migrate', 'deploy'], url('phase6d_rollback', port));
  sql('phase6d_rollback', readFileSync(`${migrationRoot}/${phase6d}/rollback.sql`, 'utf8'));
  const state = sql('phase6d_rollback', `SELECT count(*) FROM information_schema.columns WHERE table_name='TwoFactorChallenge' AND column_name='sessionVersion'; SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel='TWO_FACTOR_SETUP_STARTED';`).stdout.trim();
  if (state !== '0\n0') throw new Error(`Rollback 6D incompleto: ${state}`);
  process.stdout.write('phase6d rollback: structural rollback verified; backup required after use: ok\n');
}

let started = false;
try {
  docker(['run','--detach','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432','postgres:17-alpine'], { capture: true }); started = true;
  for (let attempt = 0; attempt < 40; attempt += 1) { if (docker(['exec',container,'pg_isready','-U','postgres'], { allowFailure: true, capture: true }).status === 0) break; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250); }
  const mapping = docker(['port',container,'5432/tcp'], { capture: true }).stdout.trim(); const port = Number(mapping.slice(mapping.lastIndexOf(':') + 1));
  if (integrationOnly) { createDatabase('phase6d_integration'); prisma(['migrate','deploy'], url('phase6d_integration',port)); runIntegration('phase6d_integration',port); process.stdout.write('phase6d PostgreSQL integration: ok\n'); }
  else { empty(port); upgrade(); invalid(); rollback(port); }
} finally { if (started) docker(['rm','--force',container], { allowFailure: true, capture: true }); }
