import { existsSync } from 'node:fs';
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

function resolveBaseUrl(request: Request): string {
  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return 'http://localhost:3000';

  const proto = request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: resolveChromeExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
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

  const baseUrl = resolveBaseUrl(request);
  const targetUrl = `${baseUrl}${informePath(propiedadId, variant)}`;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 60_000,
    });

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
