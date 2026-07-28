import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('legacy raw property API routes were removed after contract inventory', () => {
  assert.equal(existsSync(resolve(root, 'src/app/api/propiedades/route.ts')), false);
  assert.equal(existsSync(resolve(root, 'src/app/api/propiedades/[id]/route.ts')), false);
});

test('public ID loaders and interactions apply the centralized visibility policy', () => {
  const files = [
    'src/lib/propiedad-public-detail.ts',
    'src/lib/propiedad-og.ts',
    'src/actions/favoritos.ts',
    'src/app/api/contacto/route.ts',
    'src/lib/public-recent-properties.ts',
  ];
  for (const file of files) {
    assert.match(read(file), /PUBLIC_PROPERTY_WHERE/, file);
  }
});

test('public collections use the shared policy and search never admits PAUSADA', () => {
  const files = [
    'src/app/(web)/page.tsx',
    'src/app/(web)/buscar/page.tsx',
    'src/lib/data/propiedades-destacadas.ts',
    'src/lib/data/propiedades-similares.ts',
    'src/lib/data/emprendimientos.ts',
    'src/lib/data/inmobiliaria-profile.ts',
    'src/lib/data/inmobiliarias-directory.ts',
    'src/lib/favoritos.ts',
    'src/app/(web)/perfil/favoritos/page.tsx',
  ];
  for (const file of files) {
    assert.match(read(file), /PUBLIC_PROPERTY_(?:WHERE|STATES)/, file);
  }
  assert.doesNotMatch(read('src/app/(web)/buscar/page.tsx'), /PAUSADA/);
});

test('contact validates public existence before counters or records are written', () => {
  const source = read('src/app/api/contacto/route.ts');
  const validation = source.indexOf('prisma.propiedad.findFirst');
  const transaction = source.indexOf('prisma.$transaction');
  assert.ok(validation >= 0);
  assert.ok(transaction > validation);
  assert.match(source, /where: \{ id: propertyId, \.\.\.PUBLIC_PROPERTY_WHERE \}/);
});

test('cross-tenant property mutations use scoped findFirst and generic 404', () => {
  const source = read('src/app/api/panel/propiedades/[id]/route.ts');
  assert.match(source, /requirePropertyAccess\((?:id|route\.id)\)/);
  assert.doesNotMatch(source, /findUnique\(\{\s*where: \{ id \}/);
  assert.match(source, /Propiedad no encontrada\./);
});
