import assert from 'node:assert/strict';
import test from 'node:test';
import { hash } from 'bcryptjs';

import { isCredentialsLoginAllowed } from '../../src/lib/auth-credentials';

test('credentials login rejects an unverified account even with the correct password', async () => {
  const passwordHash = await hash('correct-password', 4);
  assert.equal(
    await isCredentialsLoginAllowed({ passwordHash, emailVerifiedAt: null }, 'correct-password'),
    false,
  );
});

test('credentials login accepts only a verified account with the correct password', async () => {
  const passwordHash = await hash('correct-password', 4);
  const account = { passwordHash, emailVerifiedAt: new Date() };
  assert.equal(await isCredentialsLoginAllowed(account, 'wrong-password'), false);
  assert.equal(await isCredentialsLoginAllowed(account, 'correct-password'), true);
});
