import assert from 'node:assert/strict';
import test from 'node:test';

import { createPublicContactInquiry } from '../../src/lib/public-contact-service';

const payload = {
  nombre: 'Persona interesada',
  email: 'persona@example.com',
  telefono: '2494000000',
  mensaje: 'Quiero coordinar una visita.',
  propiedadId: 'property-a',
};

test('public contact persists only after a public property is resolved', async () => {
  let writes = 0;
  const result = await createPublicContactInquiry(payload, {
    findPublicProperty: async () => ({
      id: 'property-a',
      titulo: 'Casa',
      agenteEmail: 'agent@example.com',
      adminEmail: 'admin@example.com',
    }),
    persistInquiry: async (propertyId, received) => {
      writes += 1;
      assert.equal(propertyId, 'property-a');
      assert.equal(received, payload);
      return { id: 'contact-a', createdAt: new Date('2026-07-28T12:00:00Z') };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(writes, 1);
});

test('non-public or nonexistent property creates no contact and increments no counter', async () => {
  let writes = 0;
  const result = await createPublicContactInquiry(payload, {
    findPublicProperty: async () => null,
    persistInquiry: async () => {
      writes += 1;
      return { id: 'unexpected', createdAt: new Date() };
    },
  });

  assert.deepEqual(result, { ok: false, reason: 'property_not_available' });
  assert.equal(writes, 0);
});
