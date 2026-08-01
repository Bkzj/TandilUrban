import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTH_MESSAGES } from '../../src/lib/auth-error-messages';
import { requestIpFromHeaderRecord } from '../../src/lib/rate-limit';
import { issueVerificationToken } from '../../src/lib/auth-verification';
import { type AuthEmailMessage, sendVerificationEmail } from '../../src/lib/mail';
import { createMemoryRateLimitStore } from '../../src/lib/rate-limit';
import { safeInternalCallbackUrl } from '../../src/lib/validation/auth';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '../../src/server/auth/rate-limit-policies';

test('verification email uses a trusted one-time URL and contains no tracking or sensitive account data', async () => {
  let captured: AuthEmailMessage | null = null;
  const issued = issueVerificationToken(0);
  const result = await sendVerificationEmail('person@example.invalid', issued.rawToken, {
    async send(message) { captured = message; return { ok: true, delivered: true }; },
  });
  assert.deepEqual(result, { ok: true, delivered: true });
  assert.ok(captured);
  const message = captured as AuthEmailMessage;
  assert.match(message.subject, /Verificá/u);
  assert.match(message.html, /\/api\/auth\/verify\?token=/u);
  assert.doesNotMatch(message.html, /tracking|pixel|passwordHash|userId/iu);
});

test('public messages and redirect decisions do not disclose account state', () => {
  assert.equal(AUTH_MESSAGES.registrationSucceeded, 'Si los datos son válidos, recibirás un correo para continuar.');
  assert.equal(safeInternalCallbackUrl('//evil.example'), '/');
  assert.equal(safeInternalCallbackUrl('data:text/html,evil', 'https://app.example.com'), '/');
  assert.equal(safeInternalCallbackUrl('https://evil.example', 'https://app.example.com'), '/');
  assert.equal(safeInternalCallbackUrl('/perfil'), '/perfil');
});

test('auth rate-limit keys are bounded and never contain the normalized email', async () => {
  const key = authIdentityRateLimitKey('login', 'person@example.invalid');
  assert.equal(key.includes('person@example.invalid'), false);
  assert.ok(key.length < 80);
  const store = createMemoryRateLimitStore();
  const policy = { ...AUTH_RATE_LIMIT_POLICIES.registrationIdentity, limit: 1 };
  assert.equal((await store.consume(key, policy, 0)).allowed, true);
  const denied = await store.consume(key, policy, 1);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterSeconds > 0);
});

test('NextAuth login accepts proxy IP data only from the configured trusted header', () => {
  const headers = { 'x-vercel-forwarded-for': '203.0.113.20, 10.0.0.2', 'x-forwarded-for': '198.51.100.1' };
  assert.equal(requestIpFromHeaderRecord(headers, {}), 'unknown');
  assert.equal(
    requestIpFromHeaderRecord(headers, { RATE_LIMIT_TRUSTED_IP_HEADER: 'x-vercel-forwarded-for' }),
    '203.0.113.20',
  );
});
