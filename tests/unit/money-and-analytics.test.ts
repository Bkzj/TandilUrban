import assert from 'node:assert/strict';
import test from 'node:test';

import { Prisma } from '@prisma/client';

import { decimalToMoneyText, divideMoney, validateMoneyText } from '../../src/lib/money';
import {
  buildConversionMetric,
  buildPrecioM2PorMoneda,
} from '../../src/lib/panel-analytics';
import { isCurrency } from '../../src/types/money';

test('money validation preserves cents and rejects unsafe decimal forms', () => {
  assert.deepEqual(validateMoneyText('9999999999999999.99'), {
    ok: true,
    value: '9999999999999999.99',
  });
  assert.equal(validateMoneyText('10.999').ok, false);
  assert.equal(validateMoneyText('-1.00').ok, false);
  assert.equal(validateMoneyText('1e3').ok, false);
  assert.equal(validateMoneyText('Infinity').ok, false);
  assert.equal(validateMoneyText('NaN').ok, false);
  assert.equal(decimalToMoneyText(new Prisma.Decimal('0.10').plus('0.20')), '0.30');
  assert.equal(divideMoney('100.00', 3), '33.33');
});

test('currency is closed to ARS and USD', () => {
  assert.equal(isCurrency('ARS'), true);
  assert.equal(isCurrency('USD'), true);
  assert.equal(isCurrency('EUR'), false);
  assert.equal(isCurrency('usd'), false);
});

test('price-per-square-meter aggregates ARS and USD separately with exact decimals', () => {
  const result = buildPrecioM2PorMoneda([
    { barrio: 'Centro', moneda: 'USD', totalPrecio: '100000.10', totalM2: 100 },
    { barrio: 'Centro', moneda: 'ARS', totalPrecio: '900000.90', totalM2: 90 },
    { barrio: 'Norte', moneda: 'USD', totalPrecio: '50000.20', totalM2: 50 },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((group) => group.moneda), ['ARS', 'USD']);
  assert.equal(result[0]?.promedioGeneral, '10000.01');
  assert.equal(result[1]?.promedioGeneral, '1000.00');
});

test('conversion uses one period and reports unavailable or insufficient samples truthfully', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const to = new Date('2026-01-31T00:00:00.000Z');
  assert.equal(buildConversionMetric({ contacts: 0, views: 0, from, to }).status, 'unavailable');
  assert.equal(buildConversionMetric({ contacts: 1, views: 9, from, to }).status, 'insufficient_data');
  assert.deepEqual(buildConversionMetric({ contacts: 3, views: 12, from, to }), {
    value: '25.00',
    status: 'measured',
    period: { from: from.toISOString(), to: to.toISOString() },
  });
});
