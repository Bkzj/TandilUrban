import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('schema uses exact money, closed currency and indexed measured view events', () => {
  const schema = read('database/schema.prisma');
  assert.match(schema, /precio\s+Decimal\s+@db\.Decimal\(18, 2\)/);
  assert.match(schema, /expensas\s+Decimal\?\s+@db\.Decimal\(18, 2\)/);
  assert.match(schema, /enum Moneda\s*\{[\s\S]*ARS[\s\S]*USD[\s\S]*\}/);
  assert.match(schema, /model PropiedadVista[\s\S]*@@index\(\[propiedadId, createdAt\]\)/);
  assert.match(schema, /legacyVisitCount\s+Int/);
});

test('migration validates before casts and preserves legacy visit totals', () => {
  const migration = read(
    'database/migrations/20260728150000_phase2_data_integrity_analytics/migration.sql',
  );
  assert.ok(migration.indexOf('monetary preflight failed') < migration.indexOf('TYPE DECIMAL(18,2)'));
  assert.match(migration, /round\("precio"::numeric, 2\) <> "precio"::numeric/);
  assert.match(migration, /upper\(trim\("moneda"\)\) NOT IN \('ARS', 'USD'\)/);
  assert.match(migration, /SET "legacyVisitCount" = "visitas", "visitas" = 0/);
  assert.match(read(
    'database/migrations/20260728150000_phase2_data_integrity_analytics/rollback.sql',
  ), /"visitas" = "visitas" \+ "legacyVisitCount"/);
});

test('analytics has no fabricated impressions and reconciliation defaults to dry-run', () => {
  const analytics = read('src/lib/panel-analytics.ts');
  assert.doesNotMatch(analytics, /2\.8|Impresiones|impresionesEstimadas/);
  assert.match(analytics, /propiedadVista\.count/);
  assert.match(analytics, /createdAt: \{ gte: from, lt: to \}/);
  assert.match(read('src/app/(web)/panel/page.tsx'), /requirePanelTenant\(\)/);
  const script = read('scripts/reconcile-analytics-counters.ts');
  assert.match(script, /process\.argv\.includes\('--apply'\)/);
  assert.match(script, /Dry-run: no se modificaron contadores/);
});

test('contact and physical-visit counters use transactional idempotency and immutable deltas', () => {
  const route = read('src/app/api/contacto/route.ts');
  assert.match(route, /idempotency-key/);
  assert.match(route, /PrismaClientKnownRequestError/);
  const actions = read('src/actions/contacto.ts');
  assert.match(actions, /idempotencyKey/);
  assert.match(actions, /delta: -1/);
  assert.doesNotMatch(actions, /visitaFisicaEvento\.delete/);
  assert.match(actions, /data: \{ consultas: \{ increment: 1 \} \}/);
});

test('public DTOs serialize Decimal money and view tracking cannot block the page', () => {
  assert.match(read('src/lib/public-property-dto.ts'), /decimalToMoneyText\(row\.precio\)/);
  assert.match(read('src/lib/public-propiedad-list.ts'), /decimalToMoneyText\(p\.precio\)/);
  assert.match(read('src/components/public/PropiedadPageTracker.tsx'), /\.catch\(\(\) =>/);
  const route = read('src/app/api/public/propiedades/[id]/vista/route.ts');
  assert.match(route, /PUBLIC_PROPERTY_WHERE/);
  assert.match(route, /pg_advisory_xact_lock/);
  assert.doesNotMatch(route, /requestIp|x-forwarded-for|cf-connecting-ip/);
});
