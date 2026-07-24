import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('the destructive /api/seed route does not exist', () => {
  assert.equal(existsSync(join(root, 'src/app/api/seed/route.ts')), false);
  assert.equal(existsSync(join(root, 'src/app/api/seed/route.js')), false);
});

test('.env.example contains placeholders rather than local .env values', () => {
  const example = readFileSync(join(root, '.env.example'), 'utf8');
  assert.match(example, /NEXTAUTH_SECRET="REPLACE_/);
  assert.match(example, /GEMINI_API_KEY="REPLACE_/);
  assert.match(example, /CLOUDINARY_API_SECRET="REPLACE_/);
  assert.match(example, /RESEND_API_KEY="REPLACE_/);
});
