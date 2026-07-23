import React, { useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { getCurrencyByCode } from '@/utils/currencies';
import { ExchangeRateModal } from './ExchangeRateModal';

/**
 * Watches for foreign-currency transactions detected from bank notifications
 * that are still awaiting an exchange rate (see `unconvertedByCurrency`).
 * Surfaces one ExchangeRateModal per distinct currency so the whole batch
 * can be converted at once. Cancelling a currency only dismisses it for the
 * current app session — it'll be asked again next launch if still unconverted.
 */
export function CurrencyConversionPrompt() {
  const { unconvertedByCurrency, convertPendingCurrency, currency } = useBudget();
  const [dismissedCodes, setDismissedCodes] = useState<Set<string>>(new Set());

  const pendingCodes = Object.keys(unconvertedByCurrency).filter(
    code => !dismissedCodes.has(code)
  );
  const activeCode = pendingCodes[0];
  const group = activeCode ? unconvertedByCurrency[activeCode] : undefined;
  const count = group?.length ?? 0;
  const fromCurrency = activeCode ? getCurrencyByCode(activeCode) : undefined;

  const handleConfirm = async (rate: number) => {
    if (!activeCode) return;
    await convertPendingCurrency(activeCode, rate);
  };

  const handleCancel = () => {
    if (!activeCode) return;
    setDismissedCodes(prev => new Set(prev).add(activeCode));
  };

  return (
    <ExchangeRateModal
      visible={!!activeCode}
      fromCode={activeCode ?? ''}
      fromSymbol={fromCurrency?.symbol ?? ''}
      toCode={currency.code}
      toSymbol={currency.symbol}
      subtitle={
        activeCode
          ? `We detected ${count} transaction${count > 1 ? 's' : ''} in ${activeCode}. Enter the exchange rate to add ${count > 1 ? 'them' : 'it'} to your budget.`
          : undefined
      }
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
