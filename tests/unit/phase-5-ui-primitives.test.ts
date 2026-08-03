import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';

import { AuthFeedback } from '../../src/components/auth/AuthFeedback';
import { ChoiceStep } from '../../src/components/panel/property-steps/ChoiceStep';
import { DestacadosHero } from '../../src/components/public/destacados/DestacadosHero';
import { fillEditorialImages } from '../../src/components/public/EditorialPortalHero';
import { EmprendimientosHero } from '../../src/components/public/emprendimientos/EmprendimientosHero';
import { InmobiliariasHero } from '../../src/components/public/inmobiliarias/InmobiliariasHero';
import { PropertyPrice } from '../../src/components/public/property-card/PropertyPrice';
import { resolvePropertyImageSource } from '../../src/components/public/property-card/PropertyImage';
import {
  AUTH_MESSAGES,
  authenticationErrorMessage,
  registrationErrorMessage,
} from '../../src/lib/auth-error-messages';
import { escapePlainTextForHtml } from '../../src/lib/escape-html';
import { formatMoney, formatMoneyAmount } from '../../src/lib/money-format';
import {
  buildNavbarAccess,
  FAVORITES_HREF,
  NAVBAR_MOBILE_LINKS,
} from '../../src/lib/navbar-navigation';

test('exact money presentation is shared across server and client primitives', () => {
  assert.equal(formatMoney('1234567890123456.25', 'USD'), 'USD 1.234.567.890.123.456,25');
  assert.equal(formatMoney('2100000.00', 'ARS'), 'ARS 2.100.000');
  assert.equal(formatMoney(null, 'ARS'), 'Consultar');
  assert.throws(() => formatMoneyAmount('1e3'), /INVALID_MONEY_TEXT/u);
  assert.throws(() => formatMoneyAmount('1.234'), /INVALID_MONEY_TEXT/u);

  const markup = renderToStaticMarkup(
    createElement(PropertyPrice, {
      amount: '125000.50',
      currency: 'USD',
      className: 'price',
    }),
  );
  assert.match(markup, />USD 125\.000,50</u);
});

test('plain text HTML escaping covers tags, attributes, entities and Unicode', () => {
  assert.equal(
    escapePlainTextForHtml(`<script x="1">Tomás & O'Neil</script>`),
    '&lt;script x=&quot;1&quot;&gt;Tomás &amp; O&#39;Neil&lt;/script&gt;',
  );
  assert.equal(escapePlainTextForHtml('&lt;safe&gt;'), '&amp;lt;safe&amp;gt;');
});

test('authentication feedback remains generic and exposes accessible status roles', () => {
  assert.equal(authenticationErrorMessage(), AUTH_MESSAGES.credentialsInvalid);
  assert.equal(registrationErrorMessage(), AUTH_MESSAGES.registrationFailed);
  const errorMarkup = renderToStaticMarkup(
    createElement(AuthFeedback, { message: authenticationErrorMessage(), tone: 'error' }),
  );
  const statusMarkup = renderToStaticMarkup(
    createElement(AuthFeedback, { message: AUTH_MESSAGES.resendGeneric, tone: 'neutral' }),
  );
  assert.match(errorMarkup, /role="alert"/u);
  assert.match(statusMarkup, /role="status"/u);
  assert.doesNotMatch(errorMarkup, /usuario|cuenta existe/iu);
});

test('navbar model keeps role visibility exact without treating ADMIN as a tenant', () => {
  assert.equal(buildNavbarAccess(false, undefined).favoritesHref.includes('/login?'), true);
  assert.deepEqual(buildNavbarAccess(true, 'INMOBILIARIA'), {
    authenticated: true,
    favoritesHref: FAVORITES_HREF,
    showPanelLink: true,
    showAdminLink: false,
  });
  assert.equal(buildNavbarAccess(true, 'AGENTE').showPanelLink, true);
  assert.equal(buildNavbarAccess(true, 'USUARIO_NORMAL').showPanelLink, false);
  assert.equal(buildNavbarAccess(true, 'ADMIN').showPanelLink, false);
  assert.equal(buildNavbarAccess(true, 'ADMIN').showAdminLink, true);
  assert.deepEqual(
    NAVBAR_MOBILE_LINKS.map((link) => link.label),
    ['Propiedades', 'Emprendimientos', 'Inmobiliarias', 'Mapa'],
  );
});

test('ChoiceStep uses native typed radio semantics and retains selected state', () => {
  const markup = renderToStaticMarkup(
    createElement(ChoiceStep<'VENTA' | 'ALQUILER'>, {
      title: '¿Qué tipo de operación querés publicar?',
      options: [
        { id: 'VENTA', label: 'Venta', description: 'Quiero vender una propiedad' },
        { id: 'ALQUILER', label: 'Alquiler', description: 'Quiero alquilar una propiedad' },
      ],
      value: 'VENTA',
      onChange: () => undefined,
      columnsClassName: 'gap-4 sm:grid-cols-2',
    }),
  );
  assert.match(markup, /<fieldset/u);
  assert.equal((markup.match(/type="radio"/gu) ?? []).length, 2);
  assert.match(markup, /checked="" value="VENTA"/u);
  assert.match(markup, /aria-labelledby=/u);
});

test('editorial image fixtures are deterministic and property fallback is domain-specific', () => {
  assert.deepEqual(fillEditorialImages(['custom'], ['custom', 'a', 'b', 'c']), [
    'custom',
    'a',
    'b',
  ]);
  assert.match(resolvePropertyImageSource(''), /images\.unsplash\.com/u);
  assert.equal(resolvePropertyImageSource(' https://cdn.example.test/home.jpg '), 'https://cdn.example.test/home.jpg');
});

test('all editorial hero variants retain unique headings, metrics and actions', () => {
  const images = ['https://fixture.test/a.jpg', 'https://fixture.test/b.jpg', 'https://fixture.test/c.jpg'];
  const variants = [
    {
      markup: renderToStaticMarkup(
        createElement(EmprendimientosHero, { totalItems: 3, showcaseImages: images }),
      ),
      expected: ['Emprendimientos', '3 oportunidades activas', 'Explorar oportunidades'],
    },
    {
      markup: renderToStaticMarkup(
        createElement(InmobiliariasHero, { totalAgencias: 2, showcaseImages: images }),
      ),
      expected: ['Inmobiliarias', '2 agencias en la red', 'Ver agencias'],
    },
    {
      markup: renderToStaticMarkup(
        createElement(DestacadosHero, { totalItems: 1, showcaseImages: images }),
      ),
      expected: ['Propiedades', '1 propiedad en la selección', 'Explorar selección'],
    },
  ];
  for (const variant of variants) {
    assert.equal((variant.markup.match(/<h1/gu) ?? []).length, 1);
    for (const expected of variant.expected) assert.match(variant.markup, new RegExp(expected, 'u'));
  }
});

test('client-only public map wrappers can be imported during server execution', async () => {
  await assert.doesNotReject(() => import('../../src/components/Map'));
  await assert.doesNotReject(
    () => import('../../src/components/propiedades/PropiedadUbicacionMap'),
  );
});
