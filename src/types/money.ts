export const SUPPORTED_CURRENCIES = ['ARS', 'USD'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type MoneyDto = {
  amount: string;
  currency: Currency;
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.some((currency) => currency === value);
}
