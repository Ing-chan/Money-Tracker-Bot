import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Transaction } from '@/utils/notificationHandler';

interface TransactionRowProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}

export function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const colors = useColors();
  const date = new Date(transaction.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isNotification = transaction.source === 'notification';

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
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>
        ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
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
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 0,
  },
});
