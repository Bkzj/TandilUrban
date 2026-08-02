import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import process from 'node:process';

import { hash } from 'bcryptjs';
import pg from 'pg';
import puppeteer from 'puppeteer-core';

const root = process.cwd();
const container = `tandil-phase6c-browser-${process.pid}-${randomBytes(3).toString('hex')}`;
const nextBinary = `${root}/node_modules/next/dist/bin/next`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: options.env ?? process.env, stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (result.status !== 0) throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}`);
  return result;
}
function docker(args, options = {}) { return run('docker', args, options); }
async function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('No se pudo reservar un puerto local.'));
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
  for (const candidate of candidates) if (spawnSync(candidate, ['--version'], { encoding: 'utf8' }).status === 0) return candidate;
  throw new Error('No se encontró Chrome. Configurá PUPPETEER_EXECUTABLE_PATH.');
}
async function waitForHttp(url, child) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Next.js finalizó antes de quedar disponible.');
    try { if ((await fetch(url, { redirect: 'manual' })).status < 500) return; } catch { /* iniciando */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Next.js no quedó disponible.');
}
async function terminate(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
async function login(page, appUrl, email, password, expectedSuccess) {
  await page.goto(`${appUrl}/login?callbackUrl=/perfil`, { waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', password);
  await page.click('button[type="submit"]');
  if (expectedSuccess) await page.waitForFunction(() => location.pathname === '/perfil', { timeout: 30_000 });
  else await page.waitForFunction(() => document.body.textContent?.includes('No pudimos iniciar sesión con esos datos.'), { timeout: 30_000 });
}

let started = false;
let app;
let browser;
let database;
let sink;
try {
  docker(['run', '--detach', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', 'postgres:17-alpine'], { capture: true });
  started = true;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' }).status === 0) break;
    if (attempt === 39) throw new Error('PostgreSQL 17 no quedó disponible.');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const mapping = docker(['port', container, '5432/tcp'], { capture: true }).stdout.trim();
  const databasePort = Number(mapping.slice(mapping.lastIndexOf(':') + 1));
  const databaseUrl = `postgresql://postgres@127.0.0.1:${databasePort}/postgres`;
  const appPort = await unusedPort();
  const sinkPort = await unusedPort();
  const appUrl = `http://127.0.0.1:${appPort}`;
  const mailbox = [];
  sink = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { mailbox.push(JSON.parse(body)); response.writeHead(204).end(); }
      catch { response.writeHead(400).end(); }
    });
  });
  await new Promise((resolve, reject) => { sink.once('error', reject); sink.listen(sinkPort, '127.0.0.1', resolve); });
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
    AUTH_EMAIL_TEST_SINK_URL: `http://127.0.0.1:${sinkPort}`,
    RATE_LIMIT_BACKEND: 'memory',
  };
  run('npx', ['prisma', 'migrate', 'deploy'], { env: environment });
  database = new pg.Client({ connectionString: databaseUrl });
  await database.connect();
  const marker = randomUUID();
  const resetEmail = `reset-${marker}@example.invalid`;
  const changeEmail = `change-${marker}@example.invalid`;
  const resetOldPassword = randomBytes(18).toString('base64url');
  const resetNewPassword = randomBytes(18).toString('base64url');
  const changeOldPassword = randomBytes(18).toString('base64url');
  const changeNewPassword = randomBytes(18).toString('base64url');
  for (const [id, email, password] of [['reset-browser', resetEmail, resetOldPassword], ['change-browser', changeEmail, changeOldPassword]]) {
    await database.query(
      'INSERT INTO "User" (id, rol, nombre, email, "passwordHash", "twoFactorEnabled", "emailVerifiedAt", activo, "createdAt", "updatedAt") VALUES ($1, \'USUARIO_NORMAL\', \'Persona Ficticia\', $2, $3, false, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [`${id}-${marker}`, email, await hash(password, 4)],
    );
    await database.query('INSERT INTO "AuthSessionVersion" (id, "userId", version, "updatedAt") VALUES ($1, $2, 0, CURRENT_TIMESTAMP)', [`version-${id}-${marker}`, `${id}-${marker}`]);
  }

  app = spawn(process.execPath, [nextBinary, 'dev', '--hostname', '127.0.0.1', '--port', String(appPort)], { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForHttp(`${appUrl}/login`, app);
  browser = await puppeteer.launch({ executablePath: chromeExecutable(), headless: true, args: ['--no-first-run', '--disable-background-networking'] });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('a[href="/olvide-mi-contrasena"]')]);
  await page.type('#email', resetEmail);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('Si existe una cuenta'));
  for (let attempt = 0; attempt < 30 && mailbox.length === 0; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 100));
  const resetMail = mailbox.find((message) => message.subject?.includes('Restablecé'));
  if (!resetMail) throw new Error('El adaptador local no recibió el reset email.');
  const link = resetMail.html.match(/href="([^"]*restablecer-contrasena\?token=[A-Za-z0-9_-]{43})"/u)?.[1]?.replaceAll('&amp;', '&');
  if (!link) throw new Error('El reset email no contiene el enlace esperado.');
  await page.goto(link, { waitUntil: 'networkidle0' });
  await page.type('#password', resetNewPassword);
  await page.type('#passwordConfirmation', resetNewPassword);
  await page.click('button[aria-label*="Mostrar"]');
  if ((await page.$eval('#password', (element) => element.getAttribute('type'))) !== 'text') throw new Error('Mostrar contraseña no funciona.');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('Contraseña actualizada'));
  await login(page, appUrl, resetEmail, resetOldPassword, false);
  await login(page, appUrl, resetEmail, resetNewPassword, true);

  await page.goto(`${appUrl}/api/auth/signout`, { waitUntil: 'networkidle0' });
  const csrf = await page.$eval('input[name="csrfToken"]', (element) => element.value);
  await page.evaluate(async (token) => { await fetch('/api/auth/signout', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: token, callbackUrl: '/' }) }); }, csrf);
  await page.deleteCookie(...await page.cookies());

  await page.goto(`${appUrl}/olvide-mi-contrasena`, { waitUntil: 'networkidle0' });
  await page.type('#email', `unknown-${marker}@example.invalid`);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('Si existe una cuenta'));
  await page.goto(`${appUrl}/restablecer-contrasena?token=${randomBytes(32).toString('base64url')}`, { waitUntil: 'networkidle0' });
  await page.type('#password', resetNewPassword);
  await page.type('#passwordConfirmation', resetNewPassword);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.textContent?.includes('El enlace no es válido o venció'));

  await login(page, appUrl, changeEmail, changeOldPassword, true);
  await page.goto(`${appUrl}/perfil`, { waitUntil: 'networkidle0' });
  await page.type('#currentPassword', changeOldPassword);
  await page.type('#newPassword', changeNewPassword);
  await page.type('#passwordConfirmation', changeNewPassword);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === '/login' && new URLSearchParams(location.search).get('passwordChanged') === '1', { timeout: 30_000 });
  await login(page, appUrl, changeEmail, changeOldPassword, false);
  await login(page, appUrl, changeEmail, changeNewPassword, true);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${appUrl}/olvide-mi-contrasena`, { waitUntil: 'networkidle0' });
  const mobile = await page.evaluate(() => {
    const form = document.querySelector('form'); const button = document.querySelector('button[type="submit"]');
    if (!form || !button) return false;
    const formBox = form.getBoundingClientRect(); const buttonBox = button.getBoundingClientRect();
    return formBox.left >= 0 && formBox.right <= innerWidth && buttonBox.height >= 44;
  });
  if (!mobile) throw new Error('El flujo 6C no cumple el smoke móvil.');
  if (browserErrors.length > 0) throw new Error(`El navegador detectó ${browserErrors.length} errores.`);
  process.stdout.write('phase6c browser: forgot/reset, fake email, old/new login, profile change/logout, generic unknown/invalid states, password toggle and mobile layout: ok\n');
} finally {
  if (database) await database.end().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  await terminate(app);
  if (sink) await new Promise((resolve) => sink.close(resolve));
  if (started) spawnSync('docker', ['rm', '--force', container], { encoding: 'utf8' });
}
