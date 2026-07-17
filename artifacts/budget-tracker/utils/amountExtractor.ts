/**
 * Extract monetary amounts from notification text.
 * Handles multi-currency, European number formats (7,46 €), and common banking
 * notification patterns.
 */

export interface ExtractionResult {
  amount: number | null;
  /** ISO currency code detected from the text, e.g. 'EUR', 'USD'. Null if unknown. */
  detectedCurrency: string | null;
}

// Number token: digits with optional thousand separators and decimal part.
// Matches: 7,46  |  1.234,56  |  1,234.56  |  123.45  |  100
const NUM = '[\\d][\\d.,]*';

/**
 * Determine if a number string uses European format (comma as decimal separator).
 * "7,46" → yes. "1.234,56" → yes. "1,234.56" → no. "123.45" → no.
 */
function isEuropeanFormat(s: string): boolean {
  // Ends with comma + 1 or 2 digits (not 3, which would be a thousands group)
  if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) return true;
  // European thousands + decimal: 1.234,56
  if (/\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) return true;
  return false;
}

/**
 * Parse a raw number string in either US or European locale to a JS number.
 * Returns null if the value is out of valid transaction range.
 */
function parseLocalized(raw: string, european: boolean): number | null {
  let normalized: string;
  if (european) {
    // Remove period thousand-separators, replace comma decimal with period
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove comma thousand-separators
    normalized = raw.replace(/,/g, '');
  }
  const value = parseFloat(normalized);
  if (isNaN(value) || value <= 0 || value >= 10_000_000) return null;
  return Math.round(value * 100) / 100;
}

interface PatternDef {
  /** Regex with one capture group for the numeric part. */
  re: RegExp;
  code: string;
  /** Force European format parsing regardless of auto-detection. */
  forceEuropean?: boolean;
}

// All patterns rely on isEuropeanFormat() auto-detection for locale disambiguation.
// Do NOT force European parsing per-pattern: `EUR 1,234.56` is US-format despite
// using a EUR symbol, while `7,46 €` is European-format — the number itself tells us.
const PATTERNS: PatternDef[] = [
  // ── EUR ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`€\\s*(${NUM})`),               code: 'EUR' },
  { re: new RegExp(`(${NUM})\\s*€`),               code: 'EUR' },
  { re: new RegExp(`EUR\\s*(${NUM})`, 'i'),         code: 'EUR' },
  { re: new RegExp(`(${NUM})\\s*EUR\\b`, 'i'),      code: 'EUR' },

  // ── GBP ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`£\\s*(${NUM})`),               code: 'GBP' },
  { re: new RegExp(`(${NUM})\\s*£`),               code: 'GBP' },
  { re: new RegExp(`GBP\\s*(${NUM})`, 'i'),         code: 'GBP' },
  { re: new RegExp(`(${NUM})\\s*GBP\\b`, 'i'),      code: 'GBP' },

  // ── JPY / CNY ────────────────────────────────────────────────────────────
  { re: new RegExp(`¥\\s*(${NUM})`),               code: 'JPY' },
  { re: new RegExp(`JPY\\s*(${NUM})`, 'i'),         code: 'JPY' },
  { re: new RegExp(`(${NUM})\\s*JPY\\b`, 'i'),      code: 'JPY' },
  { re: new RegExp(`CNY\\s*(${NUM})`, 'i'),         code: 'CNY' },
  { re: new RegExp(`(${NUM})\\s*CNY\\b`, 'i'),      code: 'CNY' },

  // ── INR ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`₹\\s*(${NUM})`),               code: 'INR' },
  { re: new RegExp(`INR\\s*(${NUM})`, 'i'),         code: 'INR' },

  // ── KRW ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`₩\\s*(${NUM})`),               code: 'KRW' },
  { re: new RegExp(`KRW\\s*(${NUM})`, 'i'),         code: 'KRW' },

  // ── BRL ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`R\\$\\s*(${NUM})`),             code: 'BRL' },
  { re: new RegExp(`BRL\\s*(${NUM})`, 'i'),         code: 'BRL' },

  // ── CHF ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`CHF\\s*(${NUM})`, 'i'),         code: 'CHF' },
  { re: new RegExp(`(${NUM})\\s*CHF\\b`, 'i'),      code: 'CHF' },

  // ── SEK / NOK / DKK ─────────────────────────────────────────────────────
  { re: new RegExp(`SEK\\s*(${NUM})`, 'i'),         code: 'SEK' },
  { re: new RegExp(`NOK\\s*(${NUM})`, 'i'),         code: 'NOK' },
  { re: new RegExp(`DKK\\s*(${NUM})`, 'i'),         code: 'DKK' },

  // ── PLN ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`PLN\\s*(${NUM})`, 'i'),         code: 'PLN' },
  { re: new RegExp(`(${NUM})\\s*zł`, 'i'),          code: 'PLN' },

  // ── TRY ─────────────────────────────────────────────────────────────────
  { re: new RegExp(`₺\\s*(${NUM})`),               code: 'TRY' },
  { re: new RegExp(`TRY\\s*(${NUM})`, 'i'),         code: 'TRY' },

  // ── USD ─────────────────────────────────────────────────────────────────
  // Keyword + $ (highest specificity for USD)
  { re: /(?:paid|charged|debited|deducted|spent|purchase|payment|transaction|amount|received|sent)\s*:?\s*\$\s*([\d,]+(?:\.\d{1,2})?)/, code: 'USD' },
  { re: new RegExp(`\\$\\s*(${NUM})`),              code: 'USD' },
  { re: new RegExp(`USD\\s*(${NUM})`, 'i'),         code: 'USD' },
  { re: new RegExp(`(${NUM})\\s*(?:USD|dollars?)\\b`, 'i'), code: 'USD' },
];

/**
 * Extract an amount and its currency from a notification/text string.
 */
export function extractAmountWithCurrency(text: string): ExtractionResult {
  if (!text || typeof text !== 'string') return { amount: null, detectedCurrency: null };

  // Normalise: replace the Unicode minus sign (U+2212) with a plain hyphen so
  // it doesn't interfere with digit detection; we always treat amounts as positive.
  const normalised = text.replace(/\u2212/g, '-');

  for (const { re, code, forceEuropean } of PATTERNS) {
    const match = normalised.match(re);
    if (!match) continue;

    // The captured group is the last capturing group in each regex (group 1)
    const rawNum = match[match.length - 1];
    if (!rawNum) continue;

    const european = forceEuropean ?? isEuropeanFormat(rawNum);
    const amount = parseLocalized(rawNum, european);
    if (amount !== null) {
      return { amount, detectedCurrency: code };
    }
  }

  return { amount: null, detectedCurrency: null };
}

/**
 * Simple convenience wrapper — returns just the amount (null if nothing found).
 * Kept for backwards compatibility with the headless handler.
 */
export function extractAmount(text: string): number | null {
  return extractAmountWithCurrency(text).amount;
}

/** Test helper used in Settings debug panel. */
export function testExtraction(text: string): { amount: number | null; matched: string | null; currency: string | null } {
  const { amount, detectedCurrency } = extractAmountWithCurrency(text);
  if (amount === null) return { amount: null, matched: null, currency: null };
  return { amount, matched: `${detectedCurrency ?? '?'} ${amount.toFixed(2)}`, currency: detectedCurrency };
}
