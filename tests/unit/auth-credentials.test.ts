import assert from 'node:assert/strict';
import test from 'node:test';
import { hash } from 'bcryptjs';

import { authorizeCredentials, isCredentialsLoginAllowed } from '../../src/lib/auth-credentials';

test('credentials login rejects an unverified account even with the correct password', async () => {
  const passwordHash = await hash('correct-password', 4);
  assert.equal(
    await isCredentialsLoginAllowed(
      { passwordHash, emailVerifiedAt: null, activo: true },
      'correct-password',
    ),
    false,
  );
});

test('credentials login accepts only a verified account with the correct password', async () => {
  const passwordHash = await hash('correct-password', 4);
  const account = { passwordHash, emailVerifiedAt: new Date(), activo: true };
  assert.equal(await isCredentialsLoginAllowed(account, 'wrong-password'), false);
  assert.equal(await isCredentialsLoginAllowed(account, 'correct-password'), true);
});

test('credentials login ignores only transport metadata added by NextAuth', async () => {
  const password = 'correct-password';
  const verifiedUser = {
    id: 'user-nextauth-transport',
    nombre: 'Usuario Ficticio',
    email: 'usuario@example.invalid',
    passwordHash: await hash(password, 4),
    avatarUrl: null,
    rol: 'USUARIO_NORMAL',
    agenciaId: null,
    inmobiliariaPerfil: null,
    activo: true,
    emailVerifiedAt: new Date(),
    authSessionVersion: { version: 0 },
  };
  const user = await authorizeCredentials(
    { email: 'usuario@example.invalid', password, callbackUrl: '/perfil', csrfToken: 'transport-only' },
    {
      async findUser() { return verifiedUser; },
      async ensureSessionVersion() { return 0; },
    },
  );
  assert.equal(user?.id, verifiedUser.id);
});

test('credentials login rejects a disabled account immediately', async () => {
  const passwordHash = await hash('correct-password', 4);
  assert.equal(
    await isCredentialsLoginAllowed(
      { passwordHash, emailVerifiedAt: new Date(), activo: false },
      'correct-password',
    ),
    false,
  );
});

test('credentials login fails closed while either legacy or normalized 2FA is enabled', async () => {
  const passwordHash = await hash('correct-password', 4);
  const base = { passwordHash, emailVerifiedAt: new Date(), activo: true };
  assert.equal(
    await isCredentialsLoginAllowed({ ...base, twoFactorEnabled: true }, 'correct-password'),
    false,
  );
  assert.equal(
    await isCredentialsLoginAllowed({
      ...base,
      twoFactorConfiguration: { enabledAt: new Date(), verifiedAt: new Date() },
    }, 'correct-password'),
    false,
  );
});
