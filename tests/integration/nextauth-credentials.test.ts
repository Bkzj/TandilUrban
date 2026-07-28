import assert from 'node:assert/strict';
import test from 'node:test';
import { hash } from 'bcryptjs';

import { authorizeCredentials } from '../../src/lib/auth-credentials';

test('the Credentials provider authorization contract rejects unverified users generically', async () => {
  const passwordHash = await hash('correct-password', 4);
  const result = await authorizeCredentials(
    { email: 'USER@EXAMPLE.COM', password: 'correct-password' },
    async (email) => ({
      id: 'user-a', nombre: 'Usuario', email, avatarUrl: null, rol: 'USUARIO_NORMAL',
      passwordHash, emailVerifiedAt: null, activo: true,
    }),
  );
  assert.equal(result, null);
});
