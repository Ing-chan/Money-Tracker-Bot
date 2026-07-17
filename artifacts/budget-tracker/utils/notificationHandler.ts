import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractAmountWithCurrency } from './amountExtractor';

export const TRANSACTIONS_KEY = '@budget_transactions';
export const PENDING_TRANSACTIONS_KEY = '@budget_pending_transactions';
export const BANKING_APPS_KEY = '@budget_banking_apps';
export const BUDGET_KEY = '@budget_monthly';
export const CURRENCY_KEY = '@budget_currency'; // stores a currency code string, e.g. 'EUR'

export interface Transaction {
  id: string;
  /**
   * The transaction amount. For transactions in the global currency this is
   * the value used for all budget maths. For notification-detected transactions
   * in a *foreign* currency (where no conversion was possible) this is the raw
   * detected value; such transactions are excluded from totals — see
   * `detectedCurrency`.
   */
  amount: number;
  /**
   * Set only on notification-detected transactions where the currency differs
   * from the global currency at capture time. When present the `amount` value
   * is in this currency and the transaction is NOT included in budget totals
   * (we have no exchange rate to convert it).
   */
  detectedCurrency?: string;
  /**
   * The original (pre-conversion) amount entered by the user in a foreign
   * currency. Only set on manual transactions where the user picked a
   * non-global currency and provided an exchange rate. The `amount` field holds
   * the already-converted global-currency value used for totals.
   */
  originalAmount?: number;
  /**
   * ISO currency code of `originalAmount`. Only set alongside `originalAmount`.
   */
  originalCurrency?: string;
  description: string;
  appName: string;
  date: string; // ISO string
  source: 'notification' | 'manual';
}

export interface BankingApp {
  packageName: string;
  displayName: string;
}

/**
 * Standalone headless task handler — runs in a separate JS context when a
 * notification arrives (Android only). Reads/writes AsyncStorage directly
 * since React context is unavailable.
 */
export async function handleNotification(notification: Record<string, string>): Promise<void> {
  try {
    const { app, title, text, bigText } = notification;

    // Load user's configured banking apps
    const appsJson = await AsyncStorage.getItem(BANKING_APPS_KEY);
    const bankingApps: BankingApp[] = appsJson ? JSON.parse(appsJson) : [];
    if (!bankingApps.some(b => b.packageName === app)) return;

    // Try to extract an amount and its currency
    const content = bigText || text || title || '';
    const { amount, detectedCurrency } = extractAmountWithCurrency(content);
    if (amount === null) return;

    // Persist the new transaction
    const existingJson = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const transactions: Transaction[] = existingJson ? JSON.parse(existingJson) : [];

    // Load global currency so we know whether the detected currency differs
    const currencyJson = await AsyncStorage.getItem(CURRENCY_KEY);
    const globalCurrencyCode: string = currencyJson ? JSON.parse(currencyJson) : 'USD';

    const newTx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      amount,
      // Only flag as foreign if it genuinely differs from the user's global currency.
      // When detectedCurrency matches global (or is null), amount is in the right unit.
      detectedCurrency:
        detectedCurrency && detectedCurrency !== globalCurrencyCode
          ? detectedCurrency
          : undefined,
      description: content.trim() || 'Banking transaction',
      appName: app,
      date: new Date().toISOString(),
      source: 'notification',
    };

    // Write to the pending queue instead of the confirmed transaction list.
    // On next app open the user can review, approve, or reject these entries.
    const pendingJson = await AsyncStorage.getItem(PENDING_TRANSACTIONS_KEY);
    const pending: Transaction[] = pendingJson ? JSON.parse(pendingJson) : [];
    pending.unshift(newTx);
    await AsyncStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
  } catch {
    // Silently fail — do not crash the headless task
  }
}
