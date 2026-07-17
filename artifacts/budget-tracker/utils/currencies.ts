/** Supported currencies with display metadata. */
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** Whether the symbol goes before (prefix) or after (suffix) the number. */
  symbolPosition: 'prefix' | 'suffix';
  /** Whether to omit decimal places (e.g. JPY, KRW). */
  noDecimals?: boolean;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',          symbolPosition: 'prefix' },
  { code: 'EUR', symbol: '€',   name: 'Euro',               symbolPosition: 'suffix' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      symbolPosition: 'prefix' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',       symbolPosition: 'prefix', noDecimals: true },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc',        symbolPosition: 'prefix' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',    symbolPosition: 'prefix' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',  symbolPosition: 'prefix' },
  { code: 'CNY', symbol: '元',  name: 'Chinese Yuan',       symbolPosition: 'prefix' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       symbolPosition: 'prefix' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',       symbolPosition: 'prefix' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',     symbolPosition: 'prefix' },
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won',   symbolPosition: 'prefix', noDecimals: true },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',      symbolPosition: 'suffix' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',    symbolPosition: 'suffix' },
  { code: 'DKK', symbol: 'kr',  name: 'Danish Krone',       symbolPosition: 'suffix' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',   symbolPosition: 'prefix' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',   symbolPosition: 'prefix' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', symbolPosition: 'prefix' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', symbolPosition: 'prefix' },
  { code: 'PLN', symbol: 'zł',  name: 'Polish Złoty',       symbolPosition: 'suffix' },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira',       symbolPosition: 'prefix' },
  { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal',        symbolPosition: 'prefix' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',         symbolPosition: 'prefix' },
];

export const DEFAULT_CURRENCY = CURRENCIES[0]; // USD

export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY;
}

/** Format a numeric amount with the given currency's symbol and position. */
export function formatAmount(amount: number, currency: Currency): string {
  const decimals = currency.noDecimals ? 0 : 2;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (currency.symbolPosition === 'prefix') {
    return `${currency.symbol}${formatted}`;
  }
  return `${formatted} ${currency.symbol}`;
}
