import assert from 'node:assert/strict';
import test from 'node:test';

import { togglePublicFavorite } from '../../src/lib/public-favorite-service';

test('a public property can be newly favorited', async () => {
  const writes: boolean[] = [];
  const result = await togglePublicFavorite('user-a', 'property-a', {
    publicPropertyExists: async () => true,
    isFavorite: async () => false,
    setFavorite: async (_userId, _propertyId, favorite) => {
      writes.push(favorite);
    },
  });
  assert.deepEqual(result, { ok: true, isFavorite: true });
  assert.deepEqual(writes, [true]);
});

test('a non-public property cannot be newly favorited', async () => {
  let writes = 0;
  const result = await togglePublicFavorite('user-a', 'property-a', {
    publicPropertyExists: async () => false,
    isFavorite: async () => false,
    setFavorite: async () => {
      writes += 1;
    },
  });
  assert.deepEqual(result, { ok: false, reason: 'property_not_available' });
  assert.equal(writes, 0);
});
