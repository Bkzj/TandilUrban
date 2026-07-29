import { Prisma } from '@prisma/client';

export { formatMoneyAmount } from '@/lib/money-format';

const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/;

export type MoneyValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'invalid_format' | 'negative' | 'too_large' | 'excess_precision' };

export function validateMoneyText(input: unknown, options: { allowZero?: boolean } = {}): MoneyValidationResult {
  if (typeof input !== 'string') return { ok: false, reason: 'invalid_format' };
  const value = input.trim();
  if (value.startsWith('-')) return { ok: false, reason: 'negative' };
  if (/[eE]/.test(value)) return { ok: false, reason: 'invalid_format' };
  const decimalPart = value.includes('.') ? value.split('.')[1] : undefined;
  if (decimalPart && decimalPart.length > 2) return { ok: false, reason: 'excess_precision' };
  if (!MONEY_PATTERN.test(value)) {
    const integerPart = value.split('.')[0] ?? '';
    return integerPart.length > 16
      ? { ok: false, reason: 'too_large' }
      : { ok: false, reason: 'invalid_format' };
  }

  const normalized = new Prisma.Decimal(value).toFixed(2);
  if (!options.allowZero && normalized === '0.00') {
    return { ok: false, reason: 'invalid_format' };
  }
  return { ok: true, value: normalized };
}

export function decimalToMoneyText(value: Prisma.Decimal | string): string {
  return new Prisma.Decimal(value).toFixed(2);
}

export function divideMoney(
  amount: Prisma.Decimal | string,
  divisor: number,
): string | null {
  if (!Number.isFinite(divisor) || divisor <= 0) return null;
  return new Prisma.Decimal(amount).div(new Prisma.Decimal(divisor.toString())).toDecimalPlaces(2).toFixed(2);
}
