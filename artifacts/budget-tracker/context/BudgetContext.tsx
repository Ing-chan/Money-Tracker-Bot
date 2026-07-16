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
  Transaction,
  TRANSACTIONS_KEY,
} from '@/utils/notificationHandler';

type PermissionStatus = 'authorized' | 'denied' | 'unknown';

interface BudgetContextType {
  transactions: Transaction[];
  bankingApps: BankingApp[];
  monthlyBudget: number;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  addTransaction: (
    amount: number,
    description: string,
    source: 'notification' | 'manual',
    appName?: string
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
  const appStateRef = useRef(AppState.currentState);

  const loadAll = useCallback(async () => {
    try {
      const [txJson, appsJson, budgetJson] = await Promise.all([
        AsyncStorage.getItem(TRANSACTIONS_KEY),
        AsyncStorage.getItem(BANKING_APPS_KEY),
        AsyncStorage.getItem(BUDGET_KEY),
      ]);
      if (txJson) setTransactions(JSON.parse(txJson));
      if (appsJson) setBankingApps(JSON.parse(appsJson));
      if (budgetJson) setMonthlyBudgetState(JSON.parse(budgetJson));
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

  const addTransaction = useCallback(
    async (
      amount: number,
      description: string,
      source: 'notification' | 'manual',
      appName = 'manual'
    ) => {
      const tx: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        amount,
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

  const currentMonthTotal = useMemo(
    () => currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0),
    [currentMonthTransactions]
  );

  const value = useMemo(
    () => ({
      transactions,
      bankingApps,
      monthlyBudget,
      permissionStatus,
      isLoading,
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
