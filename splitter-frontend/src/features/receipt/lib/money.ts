import { currencyDecimals } from './split';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

/** Currencies offered in the picker (the receipt's detected currency is always added on top). */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'UZS', symbol: "so'm", name: "O'zbek so'mi" },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code.toUpperCase())?.symbol ?? code.toUpperCase();
}

const NBSP = ' ';

/** 1234567 -> "1 234 567" (non-breaking spaces so an amount never wraps in the middle). */
export function groupDigits(intPart: string, sep = NBSP): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Money formatting per currency:
 *  - UZS: no decimals, space separated, "45 000 so'm"
 *  - zero-decimal currencies (JPY, KRW...): no decimals
 *  - others: 2 decimals ("12.50"), symbol in front for $ € £ ¥ ₩ ₽ ₺ and the code after otherwise
 */
export function formatMoney(amount: number, currency: string, opts: { withSymbol?: boolean } = {}): string {
  const code = (currency || 'UZS').toUpperCase();
  const dec = currencyDecimals(code);
  const negative = amount < 0;
  const fixed = Math.abs(amount).toFixed(dec);
  const [intPart = '0', frac] = fixed.split('.');
  const body = groupDigits(intPart) + (frac ? `.${frac}` : '');
  const sign = negative ? '−' : '';
  if (opts.withSymbol === false) return `${sign}${body}`;

  if (code === 'UZS') return `${sign}${body}${NBSP}so'm`;
  const symbol = currencySymbol(code);
  if (symbol !== code && ['$', '€', '£', '¥', '₩', '₽', '₺'].includes(symbol)) return `${sign}${symbol}${body}`;
  return `${sign}${body}${NBSP}${symbol}`;
}

/** Parses what a user typed into a price field: "45 000", "45000,50", "12.5" -> number | null. */
export function parseAmountInput(text: string): number | null {
  const cleaned = text.replace(/[\s ]/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return null;
  // keep only the first dot
  const [a = '', ...rest] = cleaned.split('.');
  const n = Number(rest.length ? `${a}.${rest.join('')}` : a);
  return Number.isFinite(n) ? n : null;
}
