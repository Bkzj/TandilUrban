import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, apiErrorResponse } from '../../src/lib/api-error';
import { hashIdempotencyKey, fingerprintIdempotentInput } from '../../src/lib/idempotency';
import { redactLogValue } from '../../src/lib/server-logger';
import { registerSchema, safeInternalCallbackUrl } from '../../src/lib/validation/auth';
import { publicContactSchema } from '../../src/lib/validation/contact';
import { validateServerEnvironment } from '../../src/lib/validation/environment';
import { paginationSchema, searchPropertiesSchema } from '../../src/lib/validation/pagination';
import { createPropertySchema } from '../../src/lib/validation/property';
import {
  canTransitionPropertyState,
  propertyStateUpdateSchema,
} from '../../src/lib/validation/property-state';
import { parseJsonBody } from '../../src/lib/validation/request';
import { parseImageDataUrl } from '../../src/lib/validation/upload';
import { parseSafeHttpsUrl } from '../../src/lib/validation/url';

const validProperty = {
  operacion: 'VENTA',
  tipo: 'Casa',
  direccion: '  San Martín   123  ',
  barrio: 'Centro',
  lat: -37.321,
  lng: -59.133,
  m2Total: '120.5',
  m2Cubiertos: '90',
  ambientes: '4',
  dormitorios: 3,
  banos: 2,
  cocheras: 1,
  moneda: 'USD',
  precio: '123456.78',
  expensas: null,
  caracteristicas: [' Patio ', 'Patio', 'Cochera'],
  imagenes: [],
  planoUrl: null,
  titulo: '  Casa   luminosa en el centro ',
  descripcion: 'Descripción suficientemente extensa.',
};

test('property schema normalizes once and preserves exact domain values', () => {
  const parsed = createPropertySchema.parse(validProperty);
  assert.equal(parsed.titulo, 'Casa luminosa en el centro');
  assert.equal(parsed.direccion, 'San Martín 123');
  assert.equal(parsed.precio, '123456.78');
  assert.deepEqual(parsed.caracteristicas, ['Patio', 'Cochera']);
  assert.equal(parsed.m2Total, 120.5);
});
test('property schema rejects unsafe numbers, invariants, unknown fields and collections', () => {
  assert.equal(createPropertySchema.safeParse({ ...validProperty, lat: Number.NaN }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, lng: Number.POSITIVE_INFINITY }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, lat: -91 }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, lng: 181 }).success, false);
  assert.equal(
    createPropertySchema.safeParse({ ...validProperty, m2Cubiertos: 121 }).success,
    false,
  );
  assert.equal(createPropertySchema.safeParse({ ...validProperty, precio: '1e4' }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, precio: '-1' }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, precio: '1.001' }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, tenantId: 'attacker' }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, agenteId: 'attacker' }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...validProperty, visitas: 999 }).success, false);
  assert.equal(
    createPropertySchema.safeParse({
      ...validProperty,
      caracteristicas: Array.from({ length: 41 }, (_, index) => `C${index}`),
    }).success,
    false,
  );
  assert.equal(
    createPropertySchema.safeParse({
      ...validProperty,
      imagenes: Array.from({ length: 81 }, (_, index) => ({
        url: `https://res.cloudinary.com/demo/image/upload/${index}.jpg`,
      })),
    }).success,
    false,
  );
});

test('property schema rejects duplicate managed URLs and does not treat omitted full-update fields as null', () => {
  const image = { url: 'https://res.cloudinary.com/demo/image/upload/a.jpg' };
  assert.equal(
    createPropertySchema.safeParse({ ...validProperty, imagenes: [image, image] }).success,
    false,
  );
  const partial = { ...validProperty };
  Reflect.deleteProperty(partial, 'titulo');
  assert.equal(createPropertySchema.safeParse(partial).success, false);
});

test('property state transition matrix is explicit and closed', () => {
  assert.equal(canTransitionPropertyState('DISPONIBLE', 'RESERVADA'), true);
  assert.equal(canTransitionPropertyState('RESERVADA', 'VENDIDA'), true);
  assert.equal(canTransitionPropertyState('PAUSADA', 'DISPONIBLE'), true);
  assert.equal(canTransitionPropertyState('PAUSADA', 'RESERVADA'), false);
  assert.equal(canTransitionPropertyState('VENDIDA', 'DISPONIBLE'), false);
  assert.equal(propertyStateUpdateSchema.safeParse({ estado: 'BORRADOR' }).success, false);
  assert.equal(propertyStateUpdateSchema.safeParse({ estado: 'DISPONIBLE', visitas: 5 }).success, false);
});

test('contact and auth schemas bound and normalize user-editable input', () => {
  const registration = registerSchema.parse({
    nombre: '  María   Pérez ',
    email: ' MARIA@EXAMPLE.COM ',
    password: 'correct horse battery staple',
  });
  assert.equal(registration.nombre, 'María Pérez');
  assert.equal(registration.email, 'maria@example.com');
  assert.equal(registerSchema.safeParse({ ...registration, password: 'x'.repeat(129) }).success, false);
  assert.equal(registerSchema.safeParse({ ...registration, email: 'bad' }).success, false);
  assert.equal(
    publicContactSchema.safeParse({
      nombre: 'Persona',
      email: 'p@example.com',
      telefono: '+54 249 400-0000',
      mensaje: 'x'.repeat(2_001),
      propiedadId: 'prop_1',
    }).success,
    false,
  );
  assert.equal(
    publicContactSchema.safeParse({
      nombre: 'Persona',
      email: 'p@example.com',
      telefono: '+54 249 400-0000',
      mensaje: 'Consulta válida.',
      propiedadId: 'prop_1',
      origen: 'PANEL_MANUAL',
    }).success,
    false,
  );
});

test('callback, URL, pagination and sorting policies reject dangerous inputs', () => {
  assert.equal(safeInternalCallbackUrl('https://evil.example'), '/');
  assert.equal(safeInternalCallbackUrl('//evil.example'), '/');
  assert.equal(safeInternalCallbackUrl('/panel/propiedades'), '/panel/propiedades');
  assert.equal(parseSafeHttpsUrl('javascript:alert(1)'), null);
  assert.equal(parseSafeHttpsUrl('https://user:pass@example.com/path'), null);
  assert.equal(parseSafeHttpsUrl('https://127.0.0.1/internal'), null);
  assert.equal(paginationSchema.safeParse({ page: '0', pageSize: '20' }).success, false);
  assert.equal(paginationSchema.safeParse({ page: '1', pageSize: '51' }).success, false);
  assert.equal(searchPropertiesSchema.safeParse({ sort: 'passwordHash' }).success, false);
  assert.equal(
    searchPropertiesSchema.safeParse({ minPrecio: '20.00', maxPrecio: '10.00' }).success,
    false,
  );
});

test('JSON parsing rejects oversized input before parsing and emits 413', async () => {
  const request = new Request('https://app.example.com/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(64) }),
  });
  await assert.rejects(
    () => parseJsonBody(request, publicContactSchema, 16),
    (error) => error instanceof ApiError && error.code === 'PAYLOAD_TOO_LARGE',
  );
});

test('base64 validation checks declared type, size and magic bytes', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64');
  assert.ok(parseImageDataUrl(`data:image/jpeg;base64,${jpeg}`, 16));
  assert.equal(parseImageDataUrl(`data:image/png;base64,${jpeg}`, 16), null);
  assert.equal(parseImageDataUrl(`data:image/jpeg;base64,${jpeg}`, 2), null);
  assert.equal(parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=', 100), null);
});

test('API errors have stable safe fields and correlation identifiers', async () => {
  const response = apiErrorResponse(
    new ApiError('VALIDATION_ERROR', { fields: { titulo: ['Demasiado largo.'] } }),
    'request-123',
  );
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('x-request-id'), 'request-123');
  const body: unknown = await response.json();
  assert.deepEqual(body, {
    error: 'Revisá los datos ingresados.',
    code: 'VALIDATION_ERROR',
    requestId: 'request-123',
    fields: { titulo: ['Demasiado largo.'] },
  });
});

test('logger redacts secrets recursively without retaining full personal payloads', () => {
  assert.deepEqual(
    redactLogValue({
      authorization: 'Bearer secret',
      nested: { password: 'secret', cookie: 'session', requestId: 'safe' },
    }),
    {
      authorization: '[REDACTED]',
      nested: { password: '[REDACTED]', cookie: '[REDACTED]', requestId: 'safe' },
    },
  );
});

test('idempotency hashes are scoped and fingerprints detect normalized input changes', () => {
  const first = hashIdempotencyKey('contact:tenant-a', 'request-key-123456');
  assert.equal(first.length, 64);
  assert.equal(first, hashIdempotencyKey('contact:tenant-a', 'request-key-123456'));
  assert.notEqual(first, hashIdempotencyKey('contact:tenant-b', 'request-key-123456'));
  assert.equal(
    fingerprintIdempotentInput('contact', { b: 2, a: 1 }),
    fingerprintIdempotentInput('contact', { a: 1, b: 2 }),
  );
  assert.notEqual(
    fingerprintIdempotentInput('contact', { a: 1 }),
    fingerprintIdempotentInput('contact', { a: 2 }),
  );
});

test('environment policy allows safe development defaults but rejects invalid production', () => {
  const base = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@db.example.com/app',
    NEXTAUTH_URL: 'https://app.example.com',
    NEXTAUTH_SECRET: 'a'.repeat(32),
    APP_URL: 'https://app.example.com',
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    APP_INTERNAL_URL: 'https://internal.example.com',
    VIEW_TRACKING_SECRET: 'b'.repeat(32),
    AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64'),
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'c'.repeat(32),
    RESEND_API_KEY: 're_key',
    RESEND_FROM_EMAIL: 'Propea <noreply@example.com>',
    RATE_LIMIT_BACKEND: 'postgresql',
  } satisfies NodeJS.ProcessEnv;
  assert.equal(validateServerEnvironment(base).ok, true);
  assert.equal(validateServerEnvironment({ ...base, NEXTAUTH_SECRET: 'short' }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, AUTH_ENCRYPTION_KEY: base.AUTH_ENCRYPTION_KEY.slice(0, -1) }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, AUTH_ENCRYPTION_KEY: `${'replace'}${'A'.repeat(36)}=` }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, APP_INTERNAL_URL: 'file:///etc/passwd' }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, RATE_LIMIT_BACKEND: 'memory' }).ok, false);
});
