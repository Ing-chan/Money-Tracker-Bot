/**
 * Extract dollar amounts from notification text.
 * Handles common banking notification formats.
 */
export function extractAmount(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // Patterns ordered by specificity
  const patterns = [
    // "paid $123.45", "charged $1,234.56", "deducted $12"
    /(?:paid|charged|debited|deducted|spent|purchase|payment|transaction|amount)\s*:?\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "$ 123.45", "$1,234.56", "$12"
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    // "USD 123.45", "USD123"
    /USD\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "123.45 USD", "123 dollars"
    /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 1_000_000) {
        return Math.round(value * 100) / 100; // round to 2 decimal places
      }
    }
  }

  return null;
}

/** Test an amount extraction — useful for debugging in settings */
export function testExtraction(text: string): { amount: number | null; matched: string | null } {
  const amount = extractAmount(text);
  if (amount === null) return { amount: null, matched: null };
  return { amount, matched: `$${amount.toFixed(2)}` };
}
