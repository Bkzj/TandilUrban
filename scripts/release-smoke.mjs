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
];
const EXPECTED_AUDIT = { low: 1, high: 10, critical: 1, total: 12 };
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
    const requiredTables = ['User', 'Propiedad', 'CloudinaryAsset', 'CloudinaryDeletionJob', 'PropiedadVista', 'RateLimitBucket'];
    const tables = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = ANY($1)', [requiredTables]);
    if (tables.rowCount !== requiredTables.length) throw new Error('faltan tablas requeridas de release');
    const constraints = await pool.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conname IN ('Propiedad_coordinates_check', 'CloudinaryAsset_status_dates_check', 'VerificationToken_expiry_check')");
    if (constraints.rows[0].count !== 3) throw new Error('faltan constraints requeridos de release');
  } finally {
    await pool.end();
  }
  execFileSync('npx', ['prisma', 'migrate', 'status'], { stdio: 'inherit' });
  process.stdout.write('ok database connectivity, migration status, tables and constraints\n');
}

async function applicationHealthCheck() {
  const url = new URL('/api/health', process.env.APP_INTERNAL_URL).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000), redirect: 'error' });
  const body = await response.json();
  if (!response.ok || body?.status !== 'ok' || body?.components?.process !== 'ok') throw new Error('health endpoint no está sano');
  process.stdout.write('ok application health endpoint\n');
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
