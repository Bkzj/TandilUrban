import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpaqueToken, createRecoveryCodes, createTotpSecret, decryptTotpSecret, encryptTotpSecret, hashAuthSecret, hashRecoveryCode, isTotpTimeStepFresh, matchesAuthSecretHash, normalizeRecoveryCode, totpAt, verifyTotp } from '../../src/lib/auth-security';

test('TOTP secret uses authenticated encryption and RFC-compatible six digit codes', () => {
  const key = Buffer.alloc(32, 9).toString('base64'); const secret = createTotpSecret();
  const encrypted = encryptTotpSecret(secret, key);
  assert.notEqual(encrypted, secret); assert.equal(decryptTotpSecret(encrypted, key), secret);
  const step = BigInt(1); const code = totpAt(secret, step); assert.match(code, /^\d{6}$/u); assert.equal(verifyTotp(secret, code, 30_000), step);
});

test('AES-GCM uses unique IVs and rejects tampering, malformed payloads, and wrong keys', () => {
  const key = Buffer.alloc(32, 3).toString('base64'); const other = Buffer.alloc(32, 4).toString('base64');
  const first = encryptTotpSecret('JBSWY3DPEHPK3PXP', key); const second = encryptTotpSecret('JBSWY3DPEHPK3PXP', key);
  assert.notEqual(first, second); assert.match(first, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  assert.throws(() => decryptTotpSecret(first, other));
  const parts = first.split('.'); parts[3] = `${parts[3]![0] === 'A' ? 'B' : 'A'}${parts[3]!.slice(1)}`;
  assert.throws(() => decryptTotpSecret(parts.join('.'), key));
  assert.throws(() => decryptTotpSecret('v1.invalid', key));
  assert.throws(() => encryptTotpSecret('secret', 'not-base64'));
  assert.throws(() => encryptTotpSecret('secret', key.slice(0, -1)));
});

test('recovery codes are unique, grouped, and only their hash is persistable', () => {
  const codes = createRecoveryCodes(10);
  assert.equal(new Set(codes).size, 10); assert.match(codes[0]!, /^[A-F0-9]{5}-[A-F0-9]{5}$/u);
  assert.match(hashAuthSecret(codes[0]!), /^[a-f0-9]{64}$/u);
  assert.equal(normalizeRecoveryCode(' ab12c-de345 '), 'AB12CDE345');
  assert.equal(hashRecoveryCode('ab12c-de345'), hashRecoveryCode('AB12C DE345'));
});

test('opaque tokens are URL-safe and secret hashes compare safely', () => {
  const token = createOpaqueToken(); assert.match(token, /^[A-Za-z0-9_-]{43}$/u);
  const digest = hashAuthSecret(token); assert.equal(matchesAuthSecretHash(token, digest), true); assert.equal(matchesAuthSecretHash('other', digest), false);
});

test('TOTP window and replay primitives reject invalid or reused steps', () => {
  const secret = createTotpSecret(); const now = 90_000; const step = BigInt(3); const code = totpAt(secret, step);
  assert.equal(verifyTotp(secret, code, now, 0), step); assert.equal(verifyTotp(secret, code, now + 60_000, 1), null);
  assert.equal(verifyTotp(secret, '00000x', now), null); assert.equal(isTotpTimeStepFresh(step, step), false); assert.equal(isTotpTimeStepFresh(step + BigInt(1), step), true);
});
