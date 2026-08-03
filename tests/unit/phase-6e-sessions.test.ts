import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { hashAuthSecret } from '@/lib/auth-security';
import { AUTH_SESSION_MAX_AGE_SECONDS, AUTH_SESSION_TOUCH_INTERVAL_MS } from '@/server/auth-security/auth-session-repository';
import { coarseSessionMetadata } from '@/server/auth/session-metadata';

test('session metadata is coarse, bounded and ignores untrusted detail', () => {
  assert.deepEqual(coarseSessionMetadata('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140.0.0.0 Safari/537.36 private-detail'), { browser: 'Chrome', operatingSystem: 'macOS' });
  assert.deepEqual(coarseSessionMetadata('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18 Mobile Safari/604.1'), { browser: 'Safari', operatingSystem: 'iOS' });
  const unknown = coarseSessionMetadata('\u0000attacker-controlled-value');
  assert.equal(unknown.browser, 'Navegador desconocido');
  assert.equal(unknown.operatingSystem, 'Sistema desconocido');
  assert.ok(unknown.browser.length <= 32 && unknown.operatingSystem.length <= 32);
});

test('server session lifetime and touch interval are explicit and bounded', () => {
  assert.equal(AUTH_SESSION_MAX_AGE_SECONDS, 30 * 24 * 60 * 60);
  assert.equal(AUTH_SESSION_TOUCH_INTERVAL_MS, 10 * 60 * 1_000);
});

test('session identifiers are hash-only in persistence and protected boundaries require the registry', async () => {
  const authSource = await readFile('src/lib/auth.ts', 'utf8');
  const schema = await readFile('database/schema.prisma', 'utf8');
  assert.match(authSource, /hashAuthSecret\(authenticated\.authSessionIdentifier\)/u);
  assert.match(authSource, /loadCurrentSessionAuthenticationState/u);
  assert.doesNotMatch(schema, /rawJwt|sessionCookie|userAgent|ipAddress/iu);
  assert.equal(hashAuthSecret('opaque-session-value'), hashAuthSecret('opaque-session-value'));
});

test('session-management routes scope mutations and retain same-origin protection', async () => {
  const repository = await readFile('src/server/auth-security/auth-session-repository.ts', 'utf8');
  const revokeRoute = await readFile('src/app/api/auth/sessions/revoke/route.ts', 'utf8');
  const bulkRoute = await readFile('src/app/api/auth/sessions/revoke-all/route.ts', 'utf8');
  assert.match(repository, /userId: input\.userId/u);
  assert.match(repository, /id: \{ equals: input\.targetSessionId, not: input\.currentSessionId \}/u);
  assert.match(revokeRoute, /assertTrustedMutationRequest\(request\)/u);
  assert.match(bulkRoute, /assertTrustedMutationRequest\(request\)/u);
});

test('session UI announces current session and preserves accessible destructive controls', async () => {
  const source = await readFile('src/components/perfil/SessionManagementPanel.tsx', 'utf8');
  assert.match(source, /Esta sesión/u);
  assert.match(source, /aria-label="Sesiones activas"/u);
  assert.match(source, /AuthFeedback/u);
  assert.match(source, /min-h-11/u);
  assert.doesNotMatch(source, /localStorage|sessionStorage|fingerprint|geolocation/iu);
});
