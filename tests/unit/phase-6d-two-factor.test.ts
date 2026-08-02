import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTotpProvisioningUri,
  createRecoveryCodes,
  createTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  totpAt,
} from '@/lib/auth-security';
import { type AuthEmailMessage, sendRecoveryCodesRegeneratedEmail, sendTwoFactorDisabledEmail, sendTwoFactorEnabledEmail } from '@/lib/mail';
import { twoFactorDisableSchema, twoFactorLoginCompleteSchema, twoFactorSetupConfirmSchema } from '@/lib/validation/auth';

test('Phase 6D builds a standards-compatible encoded provisioning URI', () => {
  const secret = createTotpSecret();
  const uri = new URL(buildTotpProvisioningUri(secret, 'person+test@example.invalid', 'Propea Group'));
  assert.equal(uri.protocol, 'otpauth:');
  assert.match(decodeURIComponent(uri.pathname), /Propea Group:person\+test@example\.invalid/u);
  assert.equal(uri.searchParams.get('secret'), secret);
  assert.equal(uri.searchParams.get('issuer'), 'Propea Group');
  assert.equal(uri.searchParams.get('algorithm'), 'SHA1');
  assert.equal(uri.searchParams.get('digits'), '6');
  assert.equal(uri.searchParams.get('period'), '30');
});

test('TOTP keeps leading zeroes and login schemas do not parse codes numerically', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  let step = BigInt(0);
  while (!totpAt(secret, step).startsWith('0')) step += BigInt(1);
  const code = totpAt(secret, step);
  assert.equal(code.length, 6);
  assert.equal(twoFactorSetupConfirmSchema.parse({ code }).code, code);
  assert.equal(twoFactorLoginCompleteSchema.parse({ challengeToken: 'A'.repeat(43), factor: 'totp', code }).code, code);
});

test('recovery codes are human-readable, normalized and hash-only persistable', () => {
  const codes = createRecoveryCodes(10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) {
    assert.match(code, /^[A-F0-9]{5}-[A-F0-9]{5}$/u);
    assert.equal(normalizeRecoveryCode(` ${code.toLowerCase()} `), code.replace('-', ''));
    assert.match(hashRecoveryCode(code), /^[a-f0-9]{64}$/u);
  }
  assert.equal(twoFactorDisableSchema.safeParse({ password: 'valid password', factor: 'recovery', code: codes[0] }).success, true);
});

test('2FA notification templates contain no secret, code, QR or tracking data', async () => {
  const messages: AuthEmailMessage[] = [];
  const adapter = { async send(message: AuthEmailMessage) { messages.push(message); return { ok: true as const, delivered: true }; } };
  await sendTwoFactorEnabledEmail('person@example.invalid', adapter);
  await sendTwoFactorDisabledEmail('person@example.invalid', adapter);
  await sendRecoveryCodesRegeneratedEmail('person@example.invalid', adapter);
  assert.equal(messages.length, 3);
  for (const message of messages) assert.doesNotMatch(message.html, /otpauth|secret|recovery code|código:\s*[A-Z0-9]|tracking|pixel|token=/iu);
});

test('secret-bearing UI does not persist setup or recovery material in browser storage or URLs', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('src/components/perfil/TwoFactorSecurityPanel.tsx', 'utf8'));
  assert.doesNotMatch(source, /localStorage|sessionStorage|searchParams\.set|router\.push\([^)]*(?:manualKey|recoveryCodes|qrDataUrl)/u);
  assert.match(source, /Cache-Control|no-store|recoveryCodes/u);
});
