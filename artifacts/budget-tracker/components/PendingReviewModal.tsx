/**
 * PendingReviewModal
 *
 * Full-screen overlay shown when the user opens the app and ≥3 notification
 * transactions are sitting in the pending queue (i.e. they arrived while the
 * app was closed or backgrounded).
 *
 * Layout:
 *   • Header with count badge + dismiss-for-now button
 *   • Scrollable list sized to show exactly ~4 rows at once
 *     – each row: app badge · description · amount · date
 *     – inline edit mode (tap ✏) lets the user tweak amount/description
 *     – Approve (green) + Reject (red) per row
 *   • Sticky footer: Approve All · Reject All
 */
import React, { useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useBudget } from '@/context/BudgetContext';
import { useColors } from '@/hooks/useColors';
import type { Transaction } from '@/utils/notificationHandler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Show ~4 rows without scrolling.  Each row is ~104 dp (info + buttons + divider).
const LIST_HEIGHT = Math.min(104 * 4, SCREEN_HEIGHT * 0.52);

// ─── helpers ────────────────────────────────────────────────────────────────

function appLabel(appName: string): string {
  const known: Record<string, string> = {
    'com.latuabancaperandroid': 'Intesa SP',
    'de.traderepublic.app': 'Trade Republic',
    'com.chase.sig.android': 'Chase',
    'com.infonow.bofa': 'Bank of America',
    'com.wf.wellsfargomobile': 'Wells Fargo',
    'com.venmo': 'Venmo',
    'com.squareup.cash': 'Cash App',
    'com.paypal.android.p2pmobile': 'PayPal',
  };
  return known[appName] ?? appName.split('.').pop() ?? appName;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  tx: Transaction;
  onApprove: (id: string, overrideAmount?: number, overrideDesc?: string) => void;
  onReject: (id: string) => void;
  formatMoney: (n: number, code?: string) => string;
}

function PendingRow({ tx, onApprove, onReject, formatMoney }: RowProps) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(tx.amount.toString());
  const [editDesc, setEditDesc] = useState(tx.description);

  const displayAmount = tx.detectedCurrency
    ? formatMoney(tx.amount, tx.detectedCurrency)
    : formatMoney(tx.amount);

  const handleApprove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editing) {
      const parsed = parseFloat(editAmount.replace(',', '.'));
      onApprove(tx.id, isNaN(parsed) ? undefined : parsed, editDesc.trim() || undefined);
    } else {
      onApprove(tx.id);
    }
  };

  const handleReject = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onReject(tx.id);
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {/* ── App badge + content ── */}
      <View style={styles.rowTop}>
        <View style={[styles.appBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Feather name="bell" size={13} color={colors.primary} />
        </View>

        <View style={styles.rowInfo}>
          <Text style={[styles.rowApp, { color: colors.mutedForeground }]}>
            {appLabel(tx.appName)} · {formatDate(tx.date)}
          </Text>
          {editing ? (
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
            />
          ) : (
            <Text numberOfLines={1} style={[styles.rowDesc, { color: colors.foreground }]}>
              {tx.description}
            </Text>
          )}
        </View>

        <View style={styles.rowRight}>
          {editing ? (
            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              style={[styles.editAmountInput, { color: colors.foreground, borderColor: colors.border }]}
            />
          ) : (
            <Text style={[styles.rowAmount, { color: colors.foreground }]}>
              {displayAmount}
            </Text>
          )}
          {tx.detectedCurrency && !editing && (
            <Text style={[styles.foreignBadge, { color: '#FFB020' }]}>
              {tx.detectedCurrency}
            </Text>
          )}
        </View>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.rowActions}>
        <Pressable
          onPress={() => { setEditing(e => !e); if (editing) Keyboard.dismiss(); }}
          style={({ pressed }) => [styles.actionBtn, styles.editBtn,
            { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name={editing ? 'check-square' : 'edit-2'} size={13} color={colors.mutedForeground} />
          <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>
            {editing ? 'Done editing' : 'Edit'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleApprove}
          style={({ pressed }) => [styles.actionBtn, styles.approveBtn,
            { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="check" size={13} color="#fff" />
          <Text style={[styles.actionLabel, { color: '#fff' }]}>Approve</Text>
        </Pressable>

        <Pressable
          onPress={handleReject}
          style={({ pressed }) => [styles.actionBtn, styles.rejectBtn,
            { borderColor: '#EF4444', opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="x" size={13} color="#EF4444" />
          <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function PendingReviewModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    pendingTransactions,
    pendingReviewVisible,
    approvePendingTransaction,
    rejectPendingTransaction,
    approveAllPending,
    rejectAllPending,
    dismissPendingReview,
    formatMoney,
  } = useBudget();

  if (!pendingReviewVisible) return null;

  const count = pendingTransactions.length;

  const handleApprove = (id: string, overrideAmount?: number, overrideDesc?: string) => {
    void approvePendingTransaction(id, {
      amount: overrideAmount,
      description: overrideDesc,
    });
  };

  return (
    <Modal
      visible={pendingReviewVisible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismissPendingReview}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>

          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Feather name="bell" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  New Transactions
                </Text>
                <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                  {count} captured while you were away
                </Text>
              </View>
            </View>
            <Pressable
              onPress={dismissPendingReview}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* ── Helper text ── */}
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Review each transaction before it's added to your budget.
            Rejected ones won't be counted.
          </Text>

          {/* ── Scrollable list — ~4 rows visible ── */}
          <View style={[styles.listWrapper, {
            borderColor: colors.border,
            backgroundColor: colors.card,
            height: LIST_HEIGHT,
          }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pendingTransactions.map(tx => (
                <PendingRow
                  key={tx.id}
                  tx={tx}
                  onApprove={handleApprove}
                  onReject={id => void rejectPendingTransaction(id)}
                  formatMoney={formatMoney}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Footer bulk actions ── */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void approveAllPending(); }}
              style={({ pressed }) => [styles.footerBtn, styles.footerApprove, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={[styles.footerBtnLabel, { color: '#fff' }]}>Approve All</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); void rejectAllPending(); }}
              style={({ pressed }) => [styles.footerBtn, styles.footerReject,
                { borderColor: '#EF4444', opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="x-circle" size={16} color="#EF4444" />
              <Text style={[styles.footerBtnLabel, { color: '#EF4444' }]}>Reject All</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 1 },

  helperText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginTop: -4,
  },

  // List
  listWrapper: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // Row
  row: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  appBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowApp: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  rowDesc: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  rowAmount: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  foreignBadge: { fontSize: 10, fontFamily: 'Inter_500Medium' },

  // Edit inputs (inline)
  editInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  editAmountInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    minWidth: 70,
    textAlign: 'right',
  },

  // Action buttons per row
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  editBtn: { borderWidth: 1 },
  approveBtn: { backgroundColor: '#22C55E' },
  rejectBtn: { borderWidth: 1 },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 4,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  footerBtnLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  footerApprove: { backgroundColor: '#22C55E' },
  footerReject: { borderWidth: 1.5 },
});
