import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

import nextEnv from '@next/env';
import pg from 'pg';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const REQUIRED_ENVIRONMENT = [
  'DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'APP_URL', 'NEXT_PUBLIC_APP_URL',
  'APP_INTERNAL_URL', 'VIEW_TRACKING_SECRET', 'PDF_ALLOWED_ORIGINS',
  'PUPPETEER_DISABLE_SANDBOX', 'PUPPETEER_EXECUTABLE_PATH', 'RATE_LIMIT_BACKEND',
  'RATE_LIMIT_TRUSTED_IP_HEADER', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL',
  'LEAD_NOTIFICATION_TO_EMAIL', 'MATCH_NOTIFICATION_TO_EMAIL',
  'AUTH_ENCRYPTION_KEY', 'AUTH_TOTP_ISSUER', 'AUTH_TOTP_CHALLENGE_TTL_SECONDS',
  'AUTH_PASSWORD_RESET_TTL_MINUTES', 'AUTH_EMAIL_VERIFICATION_TTL_HOURS',
  'AUTH_RECENT_LOGIN_TTL_MINUTES', 'AUTH_RECOVERY_CODE_COUNT',
];
const EXPECTED_AUDIT = { low: 0, high: 1, critical: 0, total: 1 };
const externalChecks = new Set(process.argv.slice(2));
const allowedFlags = new Set(['--check-email-provider', '--check-gemini-provider']);

for (const flag of externalChecks) {
  if (!allowedFlags.has(flag)) throw new Error(`Argumento no reconocido: ${flag}`);
}

function fail(message) {
  process.stderr.write(`release:smoke: ${message}\n`);
  process.exitCode = 1;
}

function requiredEnvironmentCheck() {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`faltan variables requeridas: ${missing.join(', ')}`);
  const urls = ['NEXTAUTH_URL', 'APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_INTERNAL_URL'];
  for (const name of urls) {
    if (new URL(process.env[name]).protocol !== 'https:') throw new Error(`${name} debe usar HTTPS`);
  }
  if (process.env.NEXTAUTH_SECRET === process.env.VIEW_TRACKING_SECRET) {
    throw new Error('VIEW_TRACKING_SECRET debe diferir de NEXTAUTH_SECRET');
  }
  if (process.env.NEXTAUTH_SECRET.length < 32 || process.env.VIEW_TRACKING_SECRET.length < 32) {
    throw new Error('los secretos deben tener al menos 32 caracteres');
  }
  const authKey = Buffer.from(process.env.AUTH_ENCRYPTION_KEY, 'base64');
  const authKeyIsCanonical = /^[A-Za-z0-9+/]{43}=$/u.test(process.env.AUTH_ENCRYPTION_KEY)
    && authKey.toString('base64') === process.env.AUTH_ENCRYPTION_KEY;
  if (!authKeyIsCanonical || authKey.byteLength !== 32 || /replace|example|change|secret/i.test(process.env.AUTH_ENCRYPTION_KEY)) {
    throw new Error('AUTH_ENCRYPTION_KEY debe ser Base64 de 32 bytes y no un placeholder');
  }
  if (!process.env.AUTH_TOTP_ISSUER.trim()) throw new Error('AUTH_TOTP_ISSUER no puede estar vacío');
  const numericRanges = [
    ['AUTH_TOTP_CHALLENGE_TTL_SECONDS', 60, 900], ['AUTH_PASSWORD_RESET_TTL_MINUTES', 5, 120],
    ['AUTH_EMAIL_VERIFICATION_TTL_HOURS', 1, 168], ['AUTH_RECENT_LOGIN_TTL_MINUTES', 1, 60],
    ['AUTH_RECOVERY_CODE_COUNT', 6, 20],
  ];
  for (const [name, minimum, maximum] of numericRanges) {
    const value = Number(process.env[name]);
    if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} fuera de rango`);
  }
  if (process.env.RATE_LIMIT_BACKEND !== 'postgresql') throw new Error('RATE_LIMIT_BACKEND debe ser postgresql');
  if (!['x-vercel-forwarded-for', 'cf-connecting-ip'].includes(process.env.RATE_LIMIT_TRUSTED_IP_HEADER)) {
    throw new Error('RATE_LIMIT_TRUSTED_IP_HEADER no está permitido');
  }
  for (const origin of process.env.PDF_ALLOWED_ORIGINS.split(',')) {
    const parsed = new URL(origin.trim());
    if (parsed.protocol !== 'https:' || parsed.origin !== origin.trim().replace(/\/$/, '')) {
      throw new Error('PDF_ALLOWED_ORIGINS debe contener sólo orígenes HTTPS exactos');
    }
  }
  if (!existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    throw new Error('PUPPETEER_EXECUTABLE_PATH no apunta a un ejecutable disponible');
  }
  process.stdout.write('ok environment, worker and local PDF-browser configuration\n');
}

async function databaseAndSchemaCheck() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    await pool.query('SELECT 1');
    const requiredTables = ['User', 'Propiedad', 'CloudinaryAsset', 'CloudinaryDeletionJob', 'PropiedadVista', 'RateLimitBucket', 'AuthSessionVersion', 'AuthSession', 'PasswordResetToken', 'TwoFactorConfiguration', 'TwoFactorChallenge', 'TwoFactorRecoveryCode', 'SecurityEvent', 'AccountInvitation'];
    const tables = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = ANY($1)', [requiredTables]);
    if (tables.rowCount !== requiredTables.length) throw new Error('faltan tablas requeridas de release');
    const constraints = await pool.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conname IN ('Propiedad_coordinates_check', 'CloudinaryAsset_status_dates_check', 'VerificationToken_expiry_check')");
    if (constraints.rows[0].count !== 3) throw new Error('faltan constraints requeridos de release');
    const authConstraints = await pool.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conname IN ('AuthSessionVersion_version_check', 'PasswordResetToken_expiry_check', 'TwoFactorConfiguration_parameters_check', 'TwoFactorChallenge_attempts_check')");
    if (authConstraints.rows[0].count !== 4) throw new Error('faltan constraints de autenticación Phase 6A');
    const authIndexes = await pool.query("SELECT count(*)::int AS count FROM pg_indexes WHERE schemaname = current_schema() AND indexname IN ('AuthSessionVersion_userId_key', 'PasswordResetToken_tokenHash_key', 'TwoFactorConfiguration_userId_key', 'TwoFactorChallenge_tokenHash_key', 'TwoFactorRecoveryCode_codeHash_key')");
    if (authIndexes.rows[0].count !== 5) throw new Error('faltan índices de autenticación Phase 6A');
    const phase6d = await pool.query("SELECT (SELECT count(*)::int FROM information_schema.columns WHERE table_name='TwoFactorChallenge' AND column_name='sessionVersion') AS version_column, (SELECT count(*)::int FROM pg_indexes WHERE indexname='TwoFactorChallenge_userId_sessionVersion_expiresAt_idx') AS version_index, (SELECT count(*)::int FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('TWO_FACTOR_SETUP_STARTED','TWO_FACTOR_CHALLENGE_FAILED','TWO_FACTOR_CHALLENGE_COMPLETED','RECOVERY_CODE_LOGIN_SUCCEEDED','RECOVERY_CODE_LOGIN_FAILED')) AS events");
    if (phase6d.rows[0].version_column !== 1 || phase6d.rows[0].version_index !== 1 || phase6d.rows[0].events !== 5) throw new Error('falta estructura de segundo factor Phase 6D');
    const phase6e = await pool.query("SELECT (SELECT count(*)::int FROM pg_constraint WHERE conname IN ('AuthSession_session_version_check','AuthSession_expiry_check','AuthSession_seen_check','AuthSession_revocation_check','AuthSession_userId_fkey')) AS constraints, (SELECT count(*)::int FROM pg_indexes WHERE indexname IN ('AuthSession_sessionHash_key','AuthSession_userId_revokedAt_expiresAt_lastSeenAt_idx','AuthSession_expiresAt_idx')) AS indexes, (SELECT count(*)::int FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('SESSION_CREATED','SESSION_REVOKED','OTHER_SESSIONS_REVOKED','ALL_SESSIONS_REVOKED','SESSION_EXPIRED')) AS events, (SELECT count(*)::int FROM \"AuthSession\" WHERE (\"revokedAt\" IS NULL) <> (\"revokedReason\" IS NULL)) AS invalid_state");
    if (phase6e.rows[0].constraints !== 5 || phase6e.rows[0].indexes !== 3 || phase6e.rows[0].events !== 5 || phase6e.rows[0].invalid_state !== 0) throw new Error('falta estructura o hay estado inválido de sesiones Phase 6E');
    const phase7 = await pool.query("SELECT (SELECT count(*)::int FROM pg_constraint WHERE conname IN ('AccountInvitation_userId_fkey','AccountInvitation_createdById_fkey','AccountInvitation_inmobiliariaId_fkey','AccountInvitation_expiry_check','AccountInvitation_state_check','AccountInvitation_role_check')) AS constraints, (SELECT count(*)::int FROM pg_indexes WHERE indexname IN ('AccountInvitation_tokenHash_key','AccountInvitation_userId_consumedAt_invalidatedAt_expiresAt_idx','AccountInvitation_inmobiliariaId_intendedRole_createdAt_idx')) AS indexes, (SELECT count(*)::int FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('GLOBAL_ADMIN_PROMOTED','INMOBILIARIA_CREATED','INMOBILIARIA_ADMIN_CREATED','AGENT_CREATED','ACCOUNT_ACTIVATED','ACCOUNT_DEACTIVATED','ROLE_CHANGED','TENANT_ASSIGNMENT_CHANGED','ACCOUNT_INVITATION_ACCEPTED')) AS events, (SELECT count(*)::int FROM \"AccountInvitation\" WHERE (\"consumedAt\" IS NOT NULL AND \"invalidatedAt\" IS NOT NULL) OR \"expiresAt\" <= \"createdAt\") AS invalid_state");
    if (phase7.rows[0].constraints !== 6 || phase7.rows[0].indexes !== 3 || phase7.rows[0].events !== 9 || phase7.rows[0].invalid_state !== 0) throw new Error('falta estructura o hay estado inválido de administración Phase 7');
    const legacy = await pool.query('SELECT count(*)::int AS count FROM "User" WHERE "twoFactorSecret" IS NOT NULL');
    if (legacy.rows[0].count !== 0) throw new Error('existen secretos 2FA legacy pendientes');
  } finally {
    await pool.end();
  }
  execFileSync('npx', ['prisma', 'migrate', 'status'], { stdio: 'inherit' });
  process.stdout.write('ok database connectivity, migration status, tables and constraints\n');
}

async function applicationHealthCheck() {
  const healthUrl = new URL('/api/health', process.env.APP_INTERNAL_URL).toString();
  const healthResponse = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000), redirect: 'error' });
  const healthBody = await healthResponse.json();
  if (!healthResponse.ok || healthBody?.status !== 'ok' || healthBody?.components?.process !== 'ok') throw new Error('health endpoint no está sano');
  const readinessUrl = new URL('/api/readiness', process.env.APP_INTERNAL_URL).toString();
  const readinessResponse = await fetch(readinessUrl, { signal: AbortSignal.timeout(5_000), redirect: 'error' });
  const readinessBody = await readinessResponse.json();
  if (!readinessResponse.ok || readinessBody?.status !== 'ready') throw new Error('readiness endpoint no está listo');
  process.stdout.write('ok application health and readiness endpoints\n');
}

function generatedCodeAndAuditCheck() {
  execFileSync('git', ['diff', '--quiet', '--', 'src/generated/prisma'], { stdio: 'inherit' });
  let output = '';
  try {
    output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  } catch (error) {
    output = error.stdout?.toString() ?? '';
  }
  const vulnerabilities = JSON.parse(output).metadata?.vulnerabilities;
  if (!vulnerabilities || ['low', 'high', 'critical', 'total'].some((key) => vulnerabilities[key] !== EXPECTED_AUDIT[key])) {
    throw new Error('la baseline de npm audit cambió');
  }
  process.stdout.write('ok generated Prisma code and accepted npm audit baseline\n');
}

async function main() {
  requiredEnvironmentCheck();
  await databaseAndSchemaCheck();
  await applicationHealthCheck();
  generatedCodeAndAuditCheck();
  if (externalChecks.size > 0) {
    process.stdout.write('external provider flags accepted; provider invocations require the staging runbook approval step.\n');
  }
  const sha = process.env.GIT_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  process.stdout.write(`release:smoke passed for ${sha}\n`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'fallo desconocido'));
