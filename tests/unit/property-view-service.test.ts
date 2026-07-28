import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRotatingAnonymousKey,
  PROPERTY_VIEW_DEDUPLICATION_MS,
  registerPropertyView,
  type PropertyViewDependencies,
} from '../../src/lib/property-view-service';

function makeMemoryDependencies(publicProperty = true) {
  const events: Date[] = [];
  let writes = 0;
  let queue = Promise.resolve();
  const dependencies: PropertyViewDependencies = {
    async findPublicProperty(propertyId) {
      return publicProperty ? { id: propertyId, inmobiliariaId: 'tenant-server-derived' } : null;
    },
    async recordIfOutsideWindow({ since, now }) {
      let counted = false;
      queue = queue.then(() => {
        if (!events.some((event) => event >= since)) {
          events.push(now);
          writes += 1;
          counted = true;
        }
      });
      await queue;
      return counted;
    },
  };
  return { dependencies, writes: () => writes };
}

const browserHeaders = new Headers({ 'user-agent': 'Mozilla/5.0' });

test('public views deduplicate concurrently and count again outside 30 minutes', async () => {
  const store = makeMemoryDependencies();
  const now = new Date('2026-07-28T12:00:00.000Z');
  const input = { propertyId: 'p1', anonymousKey: 'key', actor: null, headers: browserHeaders, now };
  const results = await Promise.all([
    registerPropertyView(input, store.dependencies),
    registerPropertyView(input, store.dependencies),
  ]);
  assert.equal(results.filter((result) => result.status === 'counted').length, 1);
  assert.equal(store.writes(), 1);

  const later = new Date(now.getTime() + PROPERTY_VIEW_DEDUPLICATION_MS + 1);
  assert.equal(
    (await registerPropertyView({ ...input, now: later }, store.dependencies)).status,
    'counted',
  );
  assert.equal(store.writes(), 2);
});

test('non-public, panel, bot, prefetch and privacy-signal views are not counted', async () => {
  const privateStore = makeMemoryDependencies(false);
  assert.equal(
    (await registerPropertyView(
      { propertyId: 'private', anonymousKey: 'key', actor: null, headers: browserHeaders },
      privateStore.dependencies,
    )).status,
    'not_found',
  );
  assert.equal(privateStore.writes(), 0);

  for (const input of [
    { actor: { role: 'INMOBILIARIA' as const }, headers: browserHeaders },
    { actor: null, headers: new Headers({ 'user-agent': 'Googlebot' }) },
    { actor: null, headers: new Headers({ purpose: 'prefetch' }) },
    { actor: null, headers: new Headers({ dnt: '1' }) },
    { actor: null, headers: new Headers({ 'sec-gpc': '1' }) },
  ]) {
    const store = makeMemoryDependencies();
    const result = await registerPropertyView(
      { propertyId: 'p1', anonymousKey: 'key', ...input },
      store.dependencies,
    );
    assert.equal(result.status, 'ignored');
    assert.equal(store.writes(), 0);
  }
});

test('anonymous HMAC is rotating and never contains the source token', () => {
  const token = '3a60bd1e-f7ce-4bd0-a6c2-73d80a384f90';
  const first = deriveRotatingAnonymousKey({
    secret: 'a-safe-test-secret-that-is-long-enough',
    visitorToken: token,
    now: new Date('2026-07-28T12:00:00Z'),
  });
  const next = deriveRotatingAnonymousKey({
    secret: 'a-safe-test-secret-that-is-long-enough',
    visitorToken: token,
    now: new Date('2026-07-29T12:00:00Z'),
  });
  assert.notEqual(first, next);
  assert.equal(first.includes(token), false);
});
