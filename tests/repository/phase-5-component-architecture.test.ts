import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('all editorial heroes compose the shared structure without duplicated scroll plumbing', () => {
  const heroes = [
    'src/components/public/emprendimientos/EmprendimientosHero.tsx',
    'src/components/public/inmobiliarias/InmobiliariasHero.tsx',
    'src/components/public/destacados/DestacadosHero.tsx',
  ];
  for (const hero of heroes) {
    const content = source(hero);
    assert.match(content, /EditorialPortalHero/u);
    assert.match(content, /EditorialHeroCollage/u);
    assert.doesNotMatch(content, /\buseScroll\b|\buseTransform\b/u);
    assert.match(content, /<motion\.h1/u);
  }
  const shared = source('src/components/public/EditorialPortalHero.tsx');
  assert.match(shared, /useReducedMotion/u);
  assert.match(shared, /focus-visible:ring-2/u);
});

test('property cards share exact price and fallback primitives without raw Prisma models', () => {
  const cardConsumers = [
    'src/components/public/PropertyCardPublic.tsx',
    'src/components/public/emprendimientos/EmprendimientoPropiedadCard.tsx',
    'src/components/web/FeaturedPropertyCard.tsx',
  ];
  for (const card of cardConsumers) {
    const content = source(card);
    assert.match(content, /PropertyPrice/u);
    assert.doesNotMatch(content, /@prisma\/client|Prisma\./u);
  }
  assert.match(source(cardConsumers[0]), /<FavoriteButton[\s\S]*className="absolute right-3 top-3 z-20"/u);
});

test('Leaflet consumers share tiles and cached Propea icons while retaining domain behavior', () => {
  const mapConsumers = [
    'src/components/MapInner.tsx',
    'src/components/propiedades/PropiedadUbicacionMapInner.tsx',
    'src/components/public/ExplorerMap.tsx',
    'src/components/panel/property-steps/LocationMap.tsx',
  ];
  for (const map of mapConsumers) {
    assert.match(source(map), /PropeaMapTileLayer/u);
    assert.doesNotMatch(source(map), /basemaps\.cartocdn\.com/u);
  }
  assert.match(source(mapConsumers[1]), /Polyline/u);
  assert.match(source(mapConsumers[2]), /FlyToVisibleBounds/u);
  assert.match(source(mapConsumers[3]), /draggable=\{true\}/u);
  assert.equal(
    (source('src/components/maps/LeafletInfrastructure.tsx').match(/basemaps\.cartocdn\.com/gu) ?? []).length,
    1,
  );
  assert.match(source('src/components/Map.tsx'), /LeafletMapLoading/u);
  assert.match(source('src/components/propiedades/PropiedadUbicacionMap.tsx'), /LeafletMapLoading/u);
});

test('superseded choice and email escape implementations stay removed', () => {
  assert.doesNotMatch(source('src/components/panel/property-steps/step-ui.tsx'), /BigChoice/u);
  assert.doesNotMatch(source('src/lib/match-notification-html.ts'), /function escapeHtml/u);
  assert.doesNotMatch(source('src/lib/resend.ts'), /function escapeHtml/u);
  assert.match(source('src/lib/resend.ts'), /escapePlainTextForHtml/u);
});

test('new shared client primitives do not cross into database or server authorization modules', () => {
  const clientPrimitives = [
    'src/components/public/EditorialPortalHero.tsx',
    'src/components/public/property-card/PropertyImage.tsx',
    'src/components/panel/property-steps/ChoiceStep.tsx',
    'src/components/maps/LeafletInfrastructure.tsx',
  ];
  for (const primitive of clientPrimitives) {
    const content = source(primitive);
    assert.doesNotMatch(content, /@\/lib\/prisma|@\/lib\/panel-authorization|@prisma\/client/u);
  }
});

test('responsive and dialog accessibility contracts remain explicit', () => {
  const hero = source('src/components/public/EditorialPortalHero.tsx');
  assert.match(hero, /sm:px-6/u);
  assert.match(hero, /lg:flex-row/u);
  assert.match(hero, /useReducedMotion/u);

  const navbar = source('src/components/Navbar.tsx');
  assert.match(navbar, /md:hidden/u);
  assert.match(navbar, /md:flex/u);
  assert.match(navbar, /Escape/u);

  const dialogHook = source('src/hooks/use-dialog-focus-trap.ts');
  assert.match(dialogHook, /event\.key !== 'Tab'/u);
  assert.match(dialogHook, /event\.key === 'Escape'/u);
  assert.match(dialogHook, /previousFocus/u);
  assert.match(source('src/components/panel/PropertyQuickView.tsx'), /useDialogFocusTrap/u);
  assert.match(source('src/components/propiedades/PropertyGalleryLightbox.tsx'), /useDialogFocusTrap/u);
});
