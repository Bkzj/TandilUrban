import { existsSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { platform } from 'node:os';

import puppeteer, { type Browser, type PDFOptions } from 'puppeteer-core';

import type { InformePdfVariant } from '@/types/informe-pdf';

const MAC_CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LINUX_CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function resolveChromeExecutable(): string {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  if (platform() === 'darwin' && existsSync(MAC_CHROME)) {
    return MAC_CHROME;
  }

  for (const candidate of LINUX_CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    'No se encontró Chrome para generar el PDF. Instalá Google Chrome o definí PUPPETEER_EXECUTABLE_PATH.',
  );
}

function informePath(id: string, variant: InformePdfVariant): string {
  return variant === 'total'
    ? `/panel/propiedades/${id}/informe-total`
    : `/panel/propiedades/${id}/informe`;
}

export type PdfSecurityConfig = {
  applicationOrigin: string;
  allowedOrigins: ReadonlySet<string>;
};

let cachedSecurityConfig: PdfSecurityConfig | undefined;

export function parsePdfSecurityConfig(env: Readonly<Record<string, string | undefined>>): PdfSecurityConfig {
  const raw = env.APP_INTERNAL_URL?.trim();
  if (!raw) throw new Error('Configuración inválida: falta APP_INTERNAL_URL.');
  const applicationUrl = new URL(raw);
  if (!['http:', 'https:'].includes(applicationUrl.protocol) || applicationUrl.username || applicationUrl.password) {
    throw new Error('Configuración inválida: APP_INTERNAL_URL debe ser una URL HTTP/HTTPS absoluta.');
  }

  const allowedOrigins = new Set<string>([applicationUrl.origin]);
  for (const item of env.PDF_ALLOWED_ORIGINS?.split(',') ?? []) {
    const value = item.trim();
    if (!value) continue;
    const candidate = new URL(value);
    if (candidate.protocol !== 'https:' || candidate.origin !== value.replace(/\/$/, '')) {
      throw new Error('Configuración inválida: PDF_ALLOWED_ORIGINS solo admite orígenes HTTPS.');
    }
    allowedOrigins.add(candidate.origin);
  }
  return { applicationOrigin: applicationUrl.origin, allowedOrigins };
}

function configuredPdfSecurity(): PdfSecurityConfig {
  cachedSecurityConfig ??= parsePdfSecurityConfig(process.env);
  return cachedSecurityConfig;
}

export function buildTrustedReportUrl(
  propiedadId: string,
  variant: InformePdfVariant,
  config: PdfSecurityConfig,
): URL {
  const target = new URL(informePath(encodeURIComponent(propiedadId), variant), config.applicationOrigin);
  if (target.origin !== config.applicationOrigin) {
    throw new Error('El destino del informe no coincide con el origen interno configurado.');
  }
  return target;
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || /^fe[89ab]/.test(normalized);
  }
  return true;
}

export async function requestUrlIsAllowed(
  rawUrl: string,
  config: PdfSecurityConfig,
  resolveHost: (hostname: string) => Promise<Array<{ address: string }>> = (hostname) =>
    lookup(hostname, { all: true, verbatim: true }),
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!config.allowedOrigins.has(url.origin)) return false;
  if (url.origin === config.applicationOrigin) return true;
  if (url.protocol !== 'https:' || ['localhost', 'localhost.localdomain'].includes(url.hostname.toLowerCase())) {
    return false;
  }
  try {
    const addresses = await resolveHost(url.hostname);
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address));
  } catch {
    return false;
  }
}

export function parseRequestCookies(cookieHeader: string, origin: string) {
  return cookieHeader.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return [];
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    return name ? [{ name, value, url: origin }] : [];
  });
}

export function navigationStayedOnTarget(responseUrl: string, target: URL, config: PdfSecurityConfig): boolean {
  try {
    return responseUrl === target.href && new URL(responseUrl).origin === config.applicationOrigin;
  } catch {
    return false;
  }
}

async function launchBrowser(): Promise<Browser> {
  const disableSandbox = process.env.PUPPETEER_DISABLE_SANDBOX === 'true';
  return puppeteer.launch({
    executablePath: resolveChromeExecutable(),
    headless: true,
    args: [
      ...(disableSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      '--font-render-hinting=none',
    ],
  });
}

export async function renderInformePdfFromUrl(
  request: Request,
  propiedadId: string,
  variant: InformePdfVariant,
): Promise<Buffer> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    throw new Error('Sesión requerida para generar el PDF.');
  }

  const security = configuredPdfSecurity();
  const targetUrl = buildTrustedReportUrl(propiedadId, variant, security);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setCookie(...parseRequestCookies(cookieHeader, security.applicationOrigin));
    await page.setRequestInterception(true);
    page.on('request', (interceptedRequest) => {
      void requestUrlIsAllowed(interceptedRequest.url(), security).then((allowed) => {
        if (interceptedRequest.isInterceptResolutionHandled()) return;
        return allowed ? interceptedRequest.continue() : interceptedRequest.abort('blockedbyclient');
      });
    });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    const response = await page.goto(targetUrl.href, {
      waitUntil: 'networkidle0',
      timeout: 60_000,
    });
    if (!response || !navigationStayedOnTarget(response.url(), targetUrl, security)) {
      throw new Error('La navegación del informe fue redirigida fuera del destino permitido.');
    }

    await page.waitForSelector('article', { timeout: 15_000 });

    await page.emulateMediaType('print');
    await page.addStyleTag({
      content: `
        [data-informe-chrome],
        .print\\:hidden {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          background: #fff !important;
        }
      `,
    });

    const pdfOptions: PDFOptions = {
      format: 'a4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    };

    const pdf = await page.pdf(pdfOptions);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
