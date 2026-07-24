import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('property DELETE schedules database cleanup without calling Cloudinary inline', () => {
  const route = readFileSync('src/app/api/panel/propiedades/[id]/route.ts', 'utf8');
  assert.match(route, /schedulePropertyDeletion/);
  assert.doesNotMatch(route, /cloudinary\.(?:api|uploader)/);
  assert.doesNotMatch(route, /delete_resources/);
});
