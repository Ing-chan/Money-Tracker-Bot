import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shareCsv } from '@/utils/csvExport';
import {
  BANKING_APPS_KEY,
  BankingApp,
  BUDGET_KEY,
  CURRENCY_KEY,
  Transaction,
  TRANSACTIONS_KEY,
  handleNotification,
} from '@/utils/notificationHandler';
import { Currency, DEFAULT_CURRENCY, formatAmount, getCurrencyByCode } from '@/utils/currencies';

type PermissionStatus = 'authorized' | 'denied' | 'unknown';

interface BudgetContextType {
  transactions: Transaction[];
  bankingApps: BankingApp[];
  monthlyBudget: number;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  /** The active global currency (used for display + new transactions). */
  currency: Currency;
  /** Change the global currency. If a rate is provided, all existing transaction amounts are multiplied by it. */
  setGlobalCurrency: (code: string, rate?: number) => Promise<void>;
  /** Format a number using the global currency (or an override currency code). */
  formatMoney: (amount: number, overrideCurrencyCode?: string) => string;
  addTransaction: (
    amount: number,
    description: string,
    source: 'notification' | 'manual',
    appName?: string,
    /** Pre-conversion amount displayed to user (manual foreign-currency entries only). */
    originalAmount?: number,
    /** Currency code of originalAmount (manual foreign-currency entries only). */
    originalCurrency?: string,
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addBankingApp: (packageName: string, displayName: string) => Promise<void>;
  removeBankingApp: (packageName: string) => Promise<void>;
  setMonthlyBudget: (amount: number) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  checkPermission: () => Promise<void>;
  openNotificationSettings: () => void;
  exportCsv: () => Promise<void>;
  clearAllData: () => Promise<void>;
  currentMonthTotal: number;
  currentMonthTransactions: Transaction[];
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}

function getNotificationModule() {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-android-notification-listener').default;
  } catch {
    return null;
  }
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankingApps, setBankingApps] = useState<BankingApp[]>([]);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(2000);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const appStateRef = useRef(AppState.currentState);

  const loadAll = useCallback(async () => {
    try {
      const [txJson, appsJson, budgetJson, currencyJson] = await Promise.all([
        AsyncStorage.getItem(TRANSACTIONS_KEY),
        AsyncStorage.getItem(BANKING_APPS_KEY),
        AsyncStorage.getItem(BUDGET_KEY),
        AsyncStorage.getItem(CURRENCY_KEY),
      ]);
      if (txJson) setTransactions(JSON.parse(txJson));
      if (appsJson) setBankingApps(JSON.parse(appsJson));
      if (budgetJson) setMonthlyBudgetState(JSON.parse(budgetJson));
      if (currencyJson) setCurrencyState(getCurrencyByCode(JSON.parse(currencyJson)));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    const mod = getNotificationModule();
    if (!mod) {
      setPermissionStatus(Platform.OS === 'android' ? 'unknown' : 'denied');
      return;
    }
    try {
      const status: PermissionStatus = await mod.getPermissionStatus();
      setPermissionStatus(status);
    } catch {
      setPermissionStatus('unknown');
    }
  }, []);

  useEffect(() => {
    loadAll();
    checkPermission();
  }, [loadAll, checkPermission]);

  // Re-check when app comes to foreground (user may have just granted access)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        loadAll();
        checkPermission();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [loadAll, checkPermission]);

  // ── Foreground transaction sync ───────────────────────────────────────────
  // The Android notification listener service fires a HeadlessJsTask (configured
  // with allowedInForeground=true) that writes new transactions to AsyncStorage.
  // The library exposes no event-emitter surface, so we poll AsyncStorage at a
  // short interval while the app is in the foreground to pick up new entries.
  // The interval is intentionally short enough to feel real-time but long enough
  // not to hammer the storage layer.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let pollId: ReturnType<typeof setInterval> | null = null;
    let lastKnownCount = -1; // -1 = uninitialised, skip first comparison

    const poll = async () => {
      try {
        const txJson = await AsyncStorage.getItem(TRANSACTIONS_KEY);
        const stored: Transaction[] = txJson ? JSON.parse(txJson) : [];
        if (lastKnownCount === -1) {
          lastKnownCount = stored.length;
          return;
        }
        if (stored.length !== lastKnownCount) {
          lastKnownCount = stored.length;
          setTransactions(stored);
        }
      } catch {
        // Ignore storage errors — the next poll will retry
      }
    };

    const start = () => {
      if (pollId != null) return;
      lastKnownCount = -1; // reset so first tick seeds the baseline
      pollId = setInterval(poll, 4000); // check every 4 seconds
    };

    const stop = () => {
      if (pollId != null) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    // Start polling immediately if app is already active
    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      sub.remove();
      stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Currency ──────────────────────────────────────────────────────────────

  const setGlobalCurrency = useCallback(
    async (code: string, rate?: number) => {
      const newCurrency = getCurrencyByCode(code);

      // If a conversion rate is given, multiply all existing transaction amounts
      let updatedTransactions = transactions;
      if (rate && rate > 0 && transactions.length > 0) {
        updatedTransactions = transactions.map(tx => {
          // Only convert transactions whose amount is in the current global currency
          // (i.e. those without detectedCurrency). Foreign-detected ones stay as-is.
          if (tx.detectedCurrency) return tx;
          return {
            ...tx,
            amount: Math.round(tx.amount * rate * 100) / 100,
            // originalAmount/originalCurrency are display-only and stay unchanged
          };
        });
        setTransactions(updatedTransactions);
        await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));

        // Also convert monthly budget
        const newBudget = Math.round(monthlyBudget * rate * 100) / 100;
        setMonthlyBudgetState(newBudget);
        await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(newBudget));
      }

      setCurrencyState(newCurrency);
      await AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(code));
    },
    [transactions, monthlyBudget]
  );

  const formatMoney = useCallback(
    (amount: number, overrideCurrencyCode?: string) => {
      const cur = overrideCurrencyCode ? getCurrencyByCode(overrideCurrencyCode) : currency;
      return formatAmount(amount, cur);
    },
    [currency]
  );

  // ── Transactions ──────────────────────────────────────────────────────────

  const addTransaction = useCallback(
    async (
      amount: number,
      description: string,
      source: 'notification' | 'manual',
      appName = 'manual',
      originalAmount?: number,
      originalCurrency?: string,
    ) => {
      const tx: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        // amount is always in the global currency (already converted by caller if needed)
        amount,
        originalAmount,
        originalCurrency,
        description: description.trim() || 'Transaction',
        appName,
        date: new Date().toISOString(),
        source,
      };
      const updated = [tx, ...transactions];
      setTransactions(updated);
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    },
    [transactions]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    },
    [transactions]
  );

  const addBankingApp = useCallback(
    async (packageName: string, displayName: string) => {
      if (bankingApps.some(b => b.packageName === packageName)) return;
      const updated = [...bankingApps, { packageName, displayName }];
      setBankingApps(updated);
      await AsyncStorage.setItem(BANKING_APPS_KEY, JSON.stringify(updated));
    },
    [bankingApps]
  );

  const removeBankingApp = useCallback(
    async (packageName: string) => {
      const updated = bankingApps.filter(b => b.packageName !== packageName);
      setBankingApps(updated);
      await AsyncStorage.setItem(BANKING_APPS_KEY, JSON.stringify(updated));
    },
    [bankingApps]
  );

  const setMonthlyBudget = useCallback(async (amount: number) => {
    setMonthlyBudgetState(amount);
    await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(amount));
  }, []);

  const refreshTransactions = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  const openNotificationSettings = useCallback(() => {
    const mod = getNotificationModule();
    if (mod) {
      try {
        mod.requestPermission();
        return;
      } catch {
        // fall through
      }
    }
    Linking.openSettings();
  }, []);

  const exportCsv = useCallback(async () => {
    await shareCsv(transactions);
  }, [transactions]);

  const clearAllData = useCallback(async () => {
    setTransactions([]);
    await AsyncStorage.removeItem(TRANSACTIONS_KEY);
  }, []);

  const now = new Date();
  const currentMonthTransactions = useMemo(
    () =>
      transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );

  // Only sum transactions whose amount is in the global currency.
  // Notification-detected transactions in a foreign currency (detectedCurrency set) are
  // excluded because we have no exchange rate to convert them — the amount is in an
  // unknown unit relative to the user's budget.
  const currentMonthTotal = useMemo(
    () =>
      currentMonthTransactions
        .filter(t => !t.detectedCurrency)
        .reduce((sum, t) => sum + t.amount, 0),
    [currentMonthTransactions]
  );

  const value = useMemo(
    () => ({
      transactions,
      bankingApps,
      monthlyBudget,
      permissionStatus,
      isLoading,
      currency,
      setGlobalCurrency,
      formatMoney,
      addTransaction,
      removeTransaction,
      addBankingApp,
      removeBankingApp,
      setMonthlyBudget,
      refreshTransactions,
      checkPermission,
      openNotificationSettings,
      exportCsv,
      clearAllData,
      currentMonthTotal,
      currentMonthTransactions,
    }),
    [
      transactions,
      bankingApps,
      monthlyBudget,
      permissionStatus,
      isLoading,
      currency,
      setGlobalCurrency,
      formatMoney,
      addTransaction,
      removeTransaction,
      addBankingApp,
      removeBankingApp,
      setMonthlyBudget,
      refreshTransactions,
      checkPermission,
      openNotificationSettings,
      exportCsv,
      clearAllData,
      currentMonthTotal,
      currentMonthTransactions,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}
