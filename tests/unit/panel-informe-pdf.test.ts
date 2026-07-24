import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTrustedReportUrl,
  navigationStayedOnTarget,
  parsePdfSecurityConfig,
  parseRequestCookies,
  requestUrlIsAllowed,
} from '../../src/lib/panel-informe-pdf';

test('report URL always uses APP_INTERNAL_URL despite manipulated request-style host values', () => {
  const config = parsePdfSecurityConfig({
    APP_INTERNAL_URL: 'https://internal.example.test',
    PDF_ALLOWED_ORIGINS: 'https://res.cloudinary.com',
    HOST: 'attacker.example',
    X_FORWARDED_HOST: 'attacker.example',
  });
  const result = buildTrustedReportUrl('property-1', 'total', config);
  assert.equal(result.origin, 'https://internal.example.test');
  assert.equal(result.pathname, '/panel/propiedades/property-1/informe-total');
});

test('PDF redirects to another origin are rejected', () => {
  const config = parsePdfSecurityConfig({ APP_INTERNAL_URL: 'https://internal.example.test' });
  const target = buildTrustedReportUrl('property-1', 'total', config);
  assert.equal(navigationStayedOnTarget(target.href, target, config), true);
  assert.equal(navigationStayedOnTarget('https://attacker.example/report', target, config), false);
});

test('PDF cookies are parsed into Puppeteer cookies scoped to the trusted origin', () => {
  assert.deepEqual(parseRequestCookies('session=abc; csrf=def', 'https://internal.example.test'), [
    { name: 'session', value: 'abc', url: 'https://internal.example.test' },
    { name: 'csrf', value: 'def', url: 'https://internal.example.test' },
  ]);
});

test('allowlisted CDN resolving to a private address is blocked', async () => {
  const config = parsePdfSecurityConfig({
    APP_INTERNAL_URL: 'https://internal.example.test',
    PDF_ALLOWED_ORIGINS: 'https://cdn.example.test',
  });
  const allowed = await requestUrlIsAllowed(
    'https://cdn.example.test/image.jpg',
    config,
    async () => [{ address: '169.254.169.254', family: 4 }],
  );
  assert.equal(allowed, false);
});

test('APP_INTERNAL_URL is required and must be HTTP(S)', () => {
  assert.throws(() => parsePdfSecurityConfig({}), /APP_INTERNAL_URL/);
  assert.throws(() => parsePdfSecurityConfig({ APP_INTERNAL_URL: 'file:///etc/passwd' }), /HTTP\/HTTPS/);
});
