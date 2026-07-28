import { Prisma } from '@prisma/client';
import type { Currency } from '@/types/money';

type ExclusivaInput = {
  operacion: string;
  moneda: Currency;
  precio: Prisma.Decimal | string;
};

/** Clasificación automática según umbrales de precio (VENTA USD / ALQUILER ARS). */
export function computeEsExclusiva(data: ExclusivaInput): boolean {
  const precio = new Prisma.Decimal(data.precio);

  if (data.operacion === 'VENTA' && data.moneda === 'USD' && precio.gt('130000.00')) {
    return true;
  }

  if (data.operacion === 'ALQUILER' && data.moneda === 'ARS' && precio.gt('2100000.00')) {
    return true;
  }

  return false;
}
