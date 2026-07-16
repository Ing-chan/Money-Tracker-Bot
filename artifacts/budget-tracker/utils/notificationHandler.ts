import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractAmount } from './amountExtractor';

export const TRANSACTIONS_KEY = '@budget_transactions';
export const BANKING_APPS_KEY = '@budget_banking_apps';
export const BUDGET_KEY = '@budget_monthly';

export interface Transaction {
  id: string;
  amount: number;
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

    // Try to extract an amount
    const content = bigText || text || title || '';
    const amount = extractAmount(content);
    if (amount === null) return;

    // Persist the new transaction
    const existingJson = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    const transactions: Transaction[] = existingJson ? JSON.parse(existingJson) : [];

    const newTx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      amount,
      description: content.trim() || 'Banking transaction',
      appName: app,
      date: new Date().toISOString(),
      source: 'notification',
    };

    transactions.unshift(newTx);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch {
    // Silently fail — do not crash the headless task
  }
}
