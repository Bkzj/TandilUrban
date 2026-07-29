import { formatMoney } from '@/lib/money-format';
import type { Currency } from '@/types/money';

type PropertyPriceProps = {
  amount: string | null;
  currency: Currency;
  className: string;
};

export function PropertyPrice({ amount, currency, className }: PropertyPriceProps) {
  return <p className={className}>{formatMoney(amount, currency)}</p>;
}
