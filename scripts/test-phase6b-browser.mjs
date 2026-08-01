import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import net from 'node:net';
import process from 'node:process';

import pg from 'pg';
import puppeteer from 'puppeteer-core';
import { compare } from 'bcryptjs';

const root = process.cwd();
const container = `tandil-phase6b-browser-${process.pid}-${randomBytes(3).toString('hex')}`;
const nextBinary = `${root}/node_modules/next/dist/bin/next`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.status !== 0) throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}`);
  return result;
}

function docker(args, options = {}) {
  return run('docker', args, options);
}

async function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('No se pudo reservar un puerto local.'));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function chromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe` : undefined,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) return candidate;
  }
  throw new Error('No se encontró Chrome. Configurá PUPPETEER_EXECUTABLE_PATH para el E2E local.');
}

async function waitForHttp(url, child) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Next.js finalizó antes de quedar disponible.');
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // El servidor aún está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Next.js no quedó disponible dentro del tiempo esperado.');
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

let started = false;
let app;
let browser;
let database;
let appDiagnostics = '';

try {
  docker([
    'run', '--detach', '--name', container,
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
    '-p', '127.0.0.1::5432',
    'postgres:17-alpine',
  ], { capture: true });
  started = true;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const ready = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' });
    if (ready.status === 0) break;
    if (attempt === 29) throw new Error('PostgreSQL 17 no quedó disponible.');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const mapping = docker(['port', container, '5432/tcp'], { capture: true }).stdout.trim();
  const databasePort = Number(mapping.slice(mapping.lastIndexOf(':') + 1));
  const databaseUrl = `postgresql://postgres@127.0.0.1:${databasePort}/postgres`;
  const appPort = await unusedPort();
  const appUrl = `http://127.0.0.1:${appPort}`;
  const environment = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NEXTAUTH_URL: appUrl,
    NEXTAUTH_SECRET: randomBytes(48).toString('base64url'),
    APP_URL: appUrl,
    NEXT_PUBLIC_APP_URL: appUrl,
    APP_INTERNAL_URL: appUrl,
    VIEW_TRACKING_SECRET: randomBytes(48).toString('base64url'),
    AUTH_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    RATE_LIMIT_BACKEND: 'memory',
  };

  run('npx', ['prisma', 'migrate', 'deploy'], { env: environment });
  app = spawn(process.execPath, [nextBinary, 'dev', '--hostname', '127.0.0.1', '--port', String(appPort)], {
    cwd: root,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [app.stdout, app.stderr]) {
    stream?.on('data', (chunk) => {
      appDiagnostics = `${appDiagnostics}${String(chunk)}`.slice(-20_000);
    });
  }
  await waitForHttp(`${appUrl}/register`, app);

  browser = await puppeteer.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: ['--no-first-run', '--disable-background-networking'],
  });
  const page = await browser.newPage();
  const browserErrors = [];
  let credentialsCallback = null;
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', async (response) => {
    if (!response.url().includes('/api/auth/callback/credentials')) return;
    try {
      credentialsCallback = { status: response.status(), body: await response.text() };
    } catch {
      credentialsCallback = { status: response.status(), body: '[unavailable]' };
    }
  });

  const marker = randomBytes(8).toString('hex');
  const email = `browser-${marker}@example.invalid`;
  const password = randomBytes(18).toString('base64url');
  const rawVerificationToken = randomBytes(32).toString('base64url');

  await page.goto(`${appUrl}/register`, { waitUntil: 'networkidle0' });
  await page.type('#nombre', 'Persona Ficticia Browser');
  await page.type('#email', email);
  await page.type('#password', password);
  await page.type('#passwordConfirmation', password);
  await Promise.all([
    page.waitForFunction(() => document.body.textContent?.includes('Revisá tu correo')),
    page.click('button[type="submit"]'),
  ]);

  database = new pg.Client({ connectionString: databaseUrl });
  await database.connect();
  const account = await database.query('SELECT id FROM "User" WHERE email = $1', [email]);
  if (account.rowCount !== 1) throw new Error('El registro E2E no creó exactamente una cuenta.');
  const tokenHash = createHash('sha256').update(rawVerificationToken).digest('hex');
  const tokenUpdate = await database.query(
    'UPDATE "VerificationToken" SET token = $1 WHERE "userId" = $2 AND "consumedAt" IS NULL AND "invalidatedAt" IS NULL',
    [tokenHash, account.rows[0].id],
  );
  if (tokenUpdate.rowCount !== 1) throw new Error('El mailbox sintético no pudo asociar el enlace de verificación.');

  await page.goto(`${appUrl}/api/auth/verify?token=${rawVerificationToken}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.textContent?.includes('Cuenta verificada'));
  await page.goto(`${appUrl}/login?callbackUrl=/perfil`, { waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForFunction(
      () => location.pathname === '/perfil' && document.body.textContent?.includes('Mi cuenta'),
      { timeout: 30_000 },
    );
  } catch {
    const publicState = await page.evaluate(() => ({
      pathname: location.pathname,
      genericFailure: document.body.textContent?.includes('No pudimos iniciar sesión con esos datos.') ?? false,
      stillLoading: document.body.textContent?.includes('Ingresando…') ?? false,
    }));
    const storedState = await database.query(
      'SELECT activo, "emailVerifiedAt", "passwordHash", "twoFactorEnabled", (SELECT count(*) FROM "AuthSessionVersion" version WHERE version."userId" = account.id) AS versions FROM "User" account WHERE id = $1',
      [account.rows[0].id],
    );
    const row = storedState.rows[0];
    const safeDatabaseState = {
      found: storedState.rowCount === 1,
      active: row?.activo === true,
      verified: row?.emailVerifiedAt !== null,
      passwordMatches: typeof row?.passwordHash === 'string' && await compare(password, row.passwordHash),
      legacyTwoFactorEnabled: row?.twoFactorEnabled === true,
      sessionVersionRows: Number(row?.versions ?? 0),
    };
    const eventState = await database.query(
      'SELECT type, count(*)::int AS count FROM "SecurityEvent" WHERE "userId" = $1 OR "userId" IS NULL GROUP BY type ORDER BY type',
      [account.rows[0].id],
    );
    const safeDiagnostics = appDiagnostics
      .split('\n')
      .filter((line) => /error|warn|credential|auth/i.test(line))
      .join('\n')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[REDACTED_EMAIL]')
      .replace(/([?&]token=)[A-Za-z0-9_-]+/giu, '$1[REDACTED_TOKEN]')
      .slice(-4_000);
    const authCookiePresent = (await page.cookies()).some((cookie) => cookie.name.includes('session-token'));
    throw new Error(`El login E2E no creó una sesión: ${JSON.stringify({ publicState, safeDatabaseState, events: eventState.rows, credentialsCallback, authCookiePresent, diagnostics: safeDiagnostics })}`);
  }

  const loginEvent = await database.query(
    'SELECT count(*)::int AS count FROM "SecurityEvent" WHERE "userId" = $1 AND type = \'LOGIN_SUCCEEDED\'',
    [account.rows[0].id],
  );
  if (loginEvent.rows[0]?.count !== 1) throw new Error('El login E2E no registró el evento de seguridad esperado.');

  await page.click('button[aria-label^="Menú de "]');
  await Promise.all([
    page.waitForFunction(() => location.pathname === '/'),
    page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes('Cerrar sesión'));
      if (!(button instanceof HTMLButtonElement)) throw new Error('No se encontró el cierre de sesión.');
      button.click();
    }),
  ]);

  await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', `${password}-incorrecta`);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('No pudimos iniciar sesión con esos datos.'));

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${appUrl}/register`, { waitUntil: 'networkidle0' });
  const mobileLayout = await page.evaluate(() => {
    const form = document.querySelector('form');
    const submit = document.querySelector('button[type="submit"]');
    if (!form || !submit) return false;
    const formBox = form.getBoundingClientRect();
    const buttonBox = submit.getBoundingClientRect();
    return formBox.left >= 0 && formBox.right <= innerWidth && buttonBox.height >= 44;
  });
  if (!mobileLayout) throw new Error('La pantalla de registro no cumple el smoke responsive móvil.');
  if (browserErrors.length > 0) throw new Error(`El navegador detectó ${browserErrors.length} error(es) de ejecución.`);

  process.stdout.write('phase6b browser: register, check-email, verify, login, authenticated area, logout, generic error and mobile layout: ok\n');
} finally {
  if (database) await database.end().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await terminate(app);
  if (started) spawnSync('docker', ['rm', '--force', container], { encoding: 'utf8' });
}
