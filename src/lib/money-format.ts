const MONEY_INPUT_PATTERN = /^(0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;

export function isValidMoneyTextInput(value: string, allowZero = false): boolean {
  const trimmed = value.trim();
  if (!MONEY_INPUT_PATTERN.test(trimmed)) return false;
  if (!allowZero && /^0(?:\.0{1,2})?$/.test(trimmed)) return false;
  return true;
}

export function formatMoneyAmount(value: string, locale = 'es-AR'): string {
  const [integer = '0', fraction = '00'] = value.split('.');
  const grouped = BigInt(integer).toLocaleString(locale);
  return fraction === '00' ? grouped : `${grouped},${fraction}`;
}
