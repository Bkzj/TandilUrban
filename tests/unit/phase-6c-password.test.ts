import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '@/lib/api-error';
import { createOpaqueToken, hashAuthSecret } from '@/lib/auth-security';
import { type AuthEmailMessage, buildPasswordResetLink, sendAccountPasswordResetEmail, sendPasswordChangedEmail } from '@/lib/mail';
import { assertTrustedMutationRequest } from '@/lib/request-security';
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation/auth';
import { GENERIC_PASSWORD_RESET_REQUEST_MESSAGE } from '@/server/auth/password-service';
import { AUTH_RATE_LIMIT_POLICIES, authIdentityRateLimitKey } from '@/server/auth/rate-limit-policies';

test('Phase 6C preserves exact passwords and requires matching confirmation', () => {
  const password = '  exact password  ';
  const reset = resetPasswordSchema.parse({ token: createOpaqueToken(), password, passwordConfirmation: password });
  const change = changePasswordSchema.parse({ currentPassword: 'current password', newPassword: password, passwordConfirmation: password });
  assert.equal(reset.password, password);
  assert.equal(change.newPassword, password);
  assert.equal(resetPasswordSchema.safeParse({ token: createOpaqueToken(), password, passwordConfirmation: password.trim() }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'current password', newPassword: password, passwordConfirmation: password.trim() }).success, false);
  assert.equal(forgotPasswordSchema.parse({ email: ' PERSON@EXAMPLE.INVALID ' }).email, 'person@example.invalid');
});

test('reset tokens are URL-safe, fixed-cost hashed and never embedded in notification email', async () => {
  const rawToken = createOpaqueToken();
  assert.match(rawToken, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(hashAuthSecret(rawToken), /^[a-f0-9]{64}$/u);
  let resetMessage: AuthEmailMessage | undefined;
  let changedMessage: AuthEmailMessage | undefined;
  await sendAccountPasswordResetEmail('person@example.invalid', rawToken, 45, {
    async send(message) { resetMessage = message; return { ok: true, delivered: true }; },
  });
  await sendPasswordChangedEmail('person@example.invalid', {
    async send(message) { changedMessage = message; return { ok: true, delivered: true }; },
  });
  assert.ok(resetMessage);
  assert.match(resetMessage.html, new RegExp(rawToken, 'u'));
  assert.doesNotMatch(resetMessage.html, /tracking|pixel|passwordHash|userId/iu);
  assert.ok(changedMessage);
  assert.equal(changedMessage.html.includes(rawToken), false);
  assert.doesNotMatch(changedMessage.html, /token=|restablecer-contrasena/iu);
  assert.equal(new URL(buildPasswordResetLink(rawToken)).pathname, '/restablecer-contrasena');
});

test('forgot-password response and rate-limit identities do not disclose an account', () => {
  assert.equal(
    GENERIC_PASSWORD_RESET_REQUEST_MESSAGE,
    'Si existe una cuenta asociada a ese correo, te enviaremos un enlace para restablecer la contraseña.',
  );
  const key = authIdentityRateLimitKey('password-reset-request', 'person@example.invalid');
  assert.equal(key.includes('person@example.invalid'), false);
  assert.ok(key.length < 90);
  assert.deepEqual(AUTH_RATE_LIMIT_POLICIES.passwordResetRequestIp, { limit: 5, windowMs: 3_600_000 });
  assert.deepEqual(AUTH_RATE_LIMIT_POLICIES.passwordResetRequestIdentity, { limit: 3, windowMs: 3_600_000 });
});

test('custom password mutations reject foreign origins and cross-site requests', () => {
  assert.doesNotThrow(() => assertTrustedMutationRequest(new Request('https://app.example.invalid/api', {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' },
  })));
  assert.throws(
    () => assertTrustedMutationRequest(new Request('https://app.example.invalid/api', { method: 'POST', headers: { origin: 'https://evil.example' } })),
    (error: unknown) => error instanceof ApiError && error.code === 'FORBIDDEN',
  );
  assert.throws(
    () => assertTrustedMutationRequest(new Request('https://app.example.invalid/api', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })),
    (error: unknown) => error instanceof ApiError && error.code === 'FORBIDDEN',
  );
});
