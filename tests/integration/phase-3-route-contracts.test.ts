import assert from 'node:assert/strict';
import test from 'node:test';

import { POST as postRegister } from '../../src/app/api/auth/register/route';
import { runRouteHandler } from '../../src/lib/route-handler';

test('registration route returns a stable validation contract for malformed input', async () => {
  const response = await postRegister(
    new Request('https://app.example.com/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Usuario',
        email: 'correo-invalido',
        password: 'una-clave-segura',
        role: 'USUARIO_NORMAL',
      }),
    }),
  );
  assert.equal(response.status, 400);
  const body: unknown = await response.json();
  assert.equal(
    typeof body === 'object' && body !== null && 'code' in body
      ? Reflect.get(body, 'code')
      : null,
    'VALIDATION_ERROR',
  );
  assert.ok(response.headers.get('x-request-id'));
});

test('registration rejects an oversized declared JSON body with 413 before hashing', async () => {
  const response = await postRegister(
    new Request('https://app.example.com/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(20_000),
      },
      body: '{}',
    }),
  );
  assert.equal(response.status, 413);
  const body: unknown = await response.json();
  assert.equal(
    typeof body === 'object' && body !== null && 'code' in body
      ? Reflect.get(body, 'code')
      : null,
    'PAYLOAD_TOO_LARGE',
  );
});

test('unexpected exceptions never expose provider messages, stacks or paths', async () => {
  const response = await runRouteHandler(
    new Request('https://app.example.com/api/test'),
    'test.internal_error',
    async () => {
      throw new Error('SQL password=secret at C:\\private\\route.ts');
    },
  );
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.doesNotMatch(text, /SQL|password|private|route\.ts|stack/iu);
  assert.match(text, /INTERNAL_ERROR/u);
});
