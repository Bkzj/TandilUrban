import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findVerificationTokenWithLegacyCompatibility,
  hashVerificationToken,
  issueVerificationToken,
} from '../../src/lib/auth-verification';

test('verification tokens are persisted only as deterministic SHA-256 hashes', () => {
  const issued = issueVerificationToken(0);
  assert.notEqual(issued.rawToken, issued.tokenHash);
  assert.equal(issued.tokenHash, hashVerificationToken(issued.rawToken));
  assert.match(issued.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(issued.expiresAt.getTime(), 24 * 60 * 60 * 1000);
});

test('legacy raw verification tokens are upgraded to hashes on first use', async () => {
  const raw = 'legacy-raw-token';
  let stored = raw;
  const record = await findVerificationTokenWithLegacyCompatibility(raw, {
    async findByToken(token) { return token === stored ? { id: 'token-a' } : null; },
    async replaceToken(id, tokenHash) { stored = tokenHash; return { id }; },
  });
  assert.deepEqual(record, { id: 'token-a' });
  assert.equal(stored, hashVerificationToken(raw));
});
