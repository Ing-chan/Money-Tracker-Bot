import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useBudget } from '@/context/BudgetContext';
import { getCurrencyByCode } from '@/utils/currencies';

/**
 * Shared state machine for changing the app's global currency.
 * Always prompts for an exchange rate (needed to convert the monthly
 * budget correctly), regardless of whether there are any transactions.
 */
export function useGlobalCurrencyChange() {
  const { currency, setGlobalCurrency } = useBudget();
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [pendingCurrencyCode, setPendingCurrencyCode] = useState('');

  const pendingCurrency = pendingCurrencyCode ? getCurrencyByCode(pendingCurrencyCode) : currency;

  const handleCurrencySelect = (code: string) => {
    if (code === currency.code) return;
    setPendingCurrencyCode(code);
    setRateModalVisible(true);
  };

  const handleRateConfirm = async (rate: number) => {
    setRateModalVisible(false);
    await setGlobalCurrency(pendingCurrencyCode, rate);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRateCancel = () => {
    setRateModalVisible(false);
    setPendingCurrencyCode('');
  };

  return {
    currencyPickerVisible,
    setCurrencyPickerVisible,
    rateModalVisible,
    pendingCurrencyCode,
    pendingCurrency,
    handleCurrencySelect,
    handleRateConfirm,
    handleRateCancel,
  };
}
