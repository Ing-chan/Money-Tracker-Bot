/**
 * Fetches the current exchange rate between two currency codes using the
 * free, keyless Frankfurter API (ECB reference rates, updated daily,
 * no API key required — see https://frankfurter.dev).
 * Returns null on any failure (network, timeout, unsupported currency)
 * so callers can gracefully fall back to manual entry.
 */
export async function fetchExchangeRate(fromCode: string, toCode: string): Promise<number | null> {
  if (!fromCode || !toCode) return null;
  if (fromCode === toCode) return 1;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(fromCode)}&symbols=${encodeURIComponent(toCode)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const rate = data?.rates?.[toCode];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}
