import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('the reviewed reachability and repository hygiene check passes', () => {
  const output = execFileSync(process.execPath, ['scripts/check-dead-code.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.match(output, /check:dead-code OK/u);
  assert.match(output, /0 ciclos/u);
});

test('removed legacy routes, incomplete security UI and orphan modules stay absent', () => {
  const removedPaths = [
    'src/app/api/propiedades/route.ts',
    'src/app/api/propiedades/[id]/route.ts',
    'src/app/api/seed/route.ts',
    'src/app/(web)/perfil/seguridad/page.tsx',
    'src/components/Button.tsx',
    'src/components/HeroColumn.tsx',
    'src/components/PropertyCard.tsx',
    'src/components/SearchBox.tsx',
    'src/components/panel/MetricCard.tsx',
    'src/components/panel/PropiedadSeguimientoSection.tsx',
    'src/components/panel/useChartMounted.ts',
    'src/components/public/OportunidadesIntro.tsx',
    'src/components/public/destacados/DestacadoPropertyCard.tsx',
    'src/constants/mapData.ts',
    'src/lib/panel-propiedad-payload.ts',
    'src/types/api.ts',
    'src/types/index.ts',
  ];

  for (const relativePath of removedPaths) {
    assert.equal(existsSync(join(root, relativePath)), false, `${relativePath} must remain absent`);
  }
});

test('legacy database candidates have a read-only preflight and remain retained', () => {
  const schema = readFileSync(join(root, 'database/schema.prisma'), 'utf8');
  const preflight = readFileSync(
    join(root, 'database/preflight/phase4-legacy-candidates.sql'),
    'utf8',
  );

  assert.match(schema, /model PuntoInteres/u);
  assert.match(schema, /enum CategoriaPuntoInteres/u);
  assert.match(schema, /twoFactorEnabled\s+Boolean/u);
  assert.match(schema, /twoFactorSecret\s+String\?/u);
  assert.match(preflight, /COUNT\(\*\)[\s\S]*punto_interes_rows/u);
  assert.match(preflight, /users_with_any_2fa_state/u);
  assert.doesNotMatch(preflight, /\b(?:ALTER|DELETE|DROP|INSERT|TRUNCATE|UPDATE)\b/iu);
});

test('package scripts reference the dead-code checker and archive validation runs it', () => {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const archiveValidator = readFileSync(join(root, 'scripts/validate-source-archive.mjs'), 'utf8');

  assert.equal(packageJson.scripts['check:dead-code'], 'node scripts/check-dead-code.mjs');
  assert.match(archiveValidator, /\['npm', \['run', 'check:dead-code'\]\]/u);
});
