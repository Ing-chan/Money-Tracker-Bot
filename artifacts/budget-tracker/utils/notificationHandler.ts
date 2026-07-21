import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractAmountWithCurrency } from './amountExtractor';

export const TRANSACTIONS_KEY = '@budget_transactions';
export const PENDING_TRANSACTIONS_KEY = '@budget_pending_transactions';
export const BANKING_APPS_KEY = '@budget_banking_apps';
export const BUDGET_KEY = '@budget_monthly';
export const CURRENCY_KEY = '@budget_currency'; // stores a currency code string, e.g. 'EUR'

/**
 * Kind of movement.
 *  - 'expense' → subtracts from the remaining budget (money leaving your account)
 *  - 'income'  → adds to the remaining budget (money entering your account)
 *
 * Legacy transactions stored before this field existed will be treated as
 * 'expense' at read-time.
 */
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  /**
   * The transaction amount (always stored as a POSITIVE number). The sign
   * relative to the budget is determined by `type`. For notification-detected
   * transactions in a *foreign* currency (where no conversion was possible)
   * this is the raw detected value; such transactions are excluded from
   * totals — see `detectedCurrency`.
   */
  amount: number;
  /** 'expense' (default) or 'income'. See TransactionType. */
  type?: TransactionType;
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

// ── Income / expense keyword detection ──────────────────────────────────────
//
// The classifier is intentionally simple: scan the notification text for
// known "money coming in" verbs/nouns in Italian and English. Anything not
// matched defaults to `expense`, which is the safe assumption for banking
// notifications (most are debits).
//
// Word boundaries are handled with \b so that e.g. "creditcard" does not
// trigger the "credit" income keyword.

const INCOME_PATTERNS: RegExp[] = [
  // Italian
  /\bricevut[oiae]\b/i,          // ricevuto / ricevuta / ricevuti / ricevute
  /\baccredit(?:o|at[oiae]|ato)\b/i, // accredito, accreditato/a/i/e
  /\bentrata\b/i,
  /\bversament[oi]\b/i,          // versamento / versamenti
  /\bincass(?:o|at[oiae])\b/i,   // incasso, incassato/a
  /\brimbors(?:o|at[oiae])\b/i,  // rimborso, rimborsato/a
  /\bstipendio\b/i,
  /\bsalari[oi]\b/i,
  /\bbonific[oi]\s+(?:in\s+)?entrata\b/i,
  /\bhai\s+ricevuto\b/i,
  // English
  /\breceived\b/i,
  /\bincoming\b/i,
  /\bcredit(?:ed)?\b/i,          // credit / credited
  /\bdeposit(?:ed)?\b/i,
  /\brefund(?:ed)?\b/i,
  /\bsalary\b/i,
  /\bpayroll\b/i,
  /\bpayment\s+received\b/i,
  /\btransfer\s+received\b/i,
  /\btop[-\s]?up\b/i,
  /\bcashback\b/i,
];

/**
 * Classify a notification body as income or expense.
 * Defaults to 'expense' when no income keywords match.
 *
 * Exported so the same classifier can be used from unit tests and (later)
 * from any UI that wants to re-classify user-edited descriptions.
 */
export function classifyTransactionType(content: string): TransactionType {
  if (!content) return 'expense';
  for (const re of INCOME_PATTERNS) {
    if (re.test(content)) return 'income';
  }
  return 'expense';
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

    // Classify: income or expense
    const type = classifyTransactionType(content);

    // Load global currency so we know whether the detected currency differs
    const currencyJson = await AsyncStorage.getItem(CURRENCY_KEY);
    const globalCurrencyCode: string = currencyJson ? JSON.parse(currencyJson) : 'USD';

    const newTx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      amount,
      type,
      // Only flag as foreign if it genuinely differs from the user's global currency.
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
