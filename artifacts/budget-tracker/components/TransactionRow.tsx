import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/context/BudgetContext';
import type { Transaction } from '@/utils/notificationHandler';

interface TransactionRowProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}

export function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const colors = useColors();
  const { formatMoney, currency: globalCurrency } = useBudget();
  const date = new Date(transaction.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isNotification = transaction.source === 'notification';

  /**
   * Display rules (in priority order):
   *
   * 1. Manual entry with original foreign amount stored
   *    → show originalAmount in originalCurrency
   *    → amount (global-currency equivalent) shown as a subtle sub-line
   *
   * 2. Notification-detected in a foreign currency (detectedCurrency set)
   *    → show raw amount in detectedCurrency
   *    → mark "⚠ excluded from budget" since no conversion was possible
   *
   * 3. Normal transaction in global currency
   *    → show amount in global currency, nothing else
   */

  let primaryAmountStr: string;
  let secondaryAmountStr: string | null = null;
  let excludedFromBudget = false;

  if (transaction.originalAmount != null && transaction.originalCurrency) {
    // Case 1: manual entry converted from a foreign currency
    primaryAmountStr = formatMoney(transaction.originalAmount, transaction.originalCurrency);
    secondaryAmountStr = `≈ ${formatMoney(transaction.amount)}`; // global-currency equivalent
  } else if (transaction.detectedCurrency) {
    // Case 2: notification-detected foreign currency, no conversion available
    primaryAmountStr = formatMoney(transaction.amount, transaction.detectedCurrency);
    excludedFromBudget = true;
  } else {
    // Case 3: normal global-currency transaction
    primaryAmountStr = formatMoney(transaction.amount);
  }

  const handleLongPress = () => {
    if (!onDelete) return;
    Alert.alert('Delete Transaction', 'Remove this transaction from your log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(transaction.id),
      },
    ]);
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isNotification ? `${colors.primary}20` : `${colors.secondary}` },
        ]}
      >
        <Feather
          name={isNotification ? 'bell' : 'edit-3'}
          size={15}
          color={isNotification ? colors.primary : colors.mutedForeground}
        />
      </View>

      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.desc, { color: colors.foreground }]}>
          {transaction.description || 'Transaction'}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {isNotification ? transaction.appName : 'Manual'} · {dateStr} · {timeStr}
        </Text>
        {excludedFromBudget && (
          <Text style={[styles.excluded, { color: '#FFB020' }]}>
            ⚠ not counted in budget — add manually to convert
          </Text>
        )}
      </View>

      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: colors.foreground }]}>{primaryAmountStr}</Text>
        {secondaryAmountStr && (
          <Text style={[styles.amountSub, { color: colors.mutedForeground }]}>
            {secondaryAmountStr}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  excluded: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  amountSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
