import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/context/BudgetContext';
import { BudgetRing } from '@/components/BudgetRing';
import { TransactionRow } from '@/components/TransactionRow';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import { CurrencyPickerModal } from '@/components/CurrencyPickerModal';
import { ExchangeRateModal } from '@/components/ExchangeRateModal';
import { getCurrencyByCode } from '@/utils/currencies';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_COUNT = 7;
const BAR_GAP = 8;
const BAR_WIDTH = (SCREEN_WIDTH - 48 - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
const CHART_HEIGHT = 64;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function WeeklyChart({ transactions }: { transactions: { date: string; amount: number }[] }) {
  const colors = useColors();
  const today = new Date();
  const days = Array.from({ length: BAR_COUNT }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (BAR_COUNT - 1 - i));
    return d;
  });
  const dayAmounts = days.map(day =>
    transactions
      .filter(t => new Date(t.date).toDateString() === day.toDateString())
      .reduce((s, t) => s + t.amount, 0)
  );
  const maxAmt = Math.max(...dayAmounts, 1);
  const totalWidth = BAR_WIDTH * BAR_COUNT + BAR_GAP * (BAR_COUNT - 1);

  return (
    <Svg width={totalWidth} height={CHART_HEIGHT + 22}>
      {days.map((day, i) => {
        const amt = dayAmounts[i];
        const barH = Math.max((amt / maxAmt) * CHART_HEIGHT, amt > 0 ? 4 : 0);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = CHART_HEIGHT - barH;
        const isToday = i === BAR_COUNT - 1;
        const label = day.toLocaleDateString('en-US', { weekday: 'narrow' });
        return (
          <G key={i}>
            <Rect
              x={x}
              y={amt > 0 ? y : CHART_HEIGHT - 3}
              width={BAR_WIDTH}
              height={amt > 0 ? barH : 3}
              rx={6}
              fill={colors.primary}
              fillOpacity={isToday ? 1 : 0.35}
            />
            <SvgText
              x={x + BAR_WIDTH / 2}
              y={CHART_HEIGHT + 16}
              textAnchor="middle"
              fontSize={11}
              fill={isToday ? colors.primary : colors.mutedForeground}
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    transactions,
    monthlyBudget,
    currentMonthSpent,
    currentMonthIncome,
    currentMonthTransactions,
    removeTransaction,
    refreshTransactions,
    permissionStatus,
    currency,
    setGlobalCurrency,
    formatMoney,
  } = useBudget();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Global currency change flow
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [pendingCurrencyCode, setPendingCurrencyCode] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  const recentTransactions = transactions.slice(0, 5);
  const remaining = monthlyBudget - currentMonthSpent + currentMonthIncome;
  const budgetPct = monthlyBudget > 0 ? Math.min(currentMonthTotal / monthlyBudget, 1) : 0;
  const isOverBudget = monthlyBudget > 0 && currentMonthTotal > monthlyBudget;

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleCurrencySelect = (code: string) => {
    if (code === currency.code) return;
    setPendingCurrencyCode(code);
    // Need a rate to convert existing transactions
    setRateModalVisible(true);
  };

  const handleRateConfirm = async (rate: number) => {
    setRateModalVisible(false);
    await setGlobalCurrency(pendingCurrencyCode, rate);
  };

  const handleRateCancel = () => {
    setRateModalVisible(false);
    setPendingCurrencyCode('');
  };

  // Find the pending currency object for the ExchangeRateModal
  const pendingCurrency = pendingCurrencyCode ? getCurrencyByCode(pendingCurrencyCode) : currency;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#0D1525', '#162038']}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{dateLabel}</Text>

          {/* Notification status badge */}
          {permissionStatus !== 'authorized' && (
            <View style={styles.statusBadge}>
              <Feather name="alert-circle" size={12} color="#FFB020" />
              <Text style={styles.statusText}>Notification access not enabled — go to Settings</Text>
            </View>
          )}
        </LinearGradient>

        {/* Spending Card */}
        <View style={styles.cardSection}>
          <LinearGradient
            colors={['#0D1525', '#1A2540']}
            style={[styles.spendingCard, { borderRadius: colors.radius + 2 }]}
          >
            {/* Month label + tappable currency badge */}
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>{monthLabel}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.currencyBadge,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setCurrencyPickerVisible(true)}
              >
                <Text style={styles.currencyBadgeText}>{currency.symbol}</Text>
                <Feather name="chevron-down" size={10} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            <View style={styles.ringRow}>
              <BudgetRing
                spent={currentMonthSpent}
                budget={monthlyBudget}
                size={170}
                strokeWidth={14}
                primaryColor={colors.primary}
                trackColor="rgba(255,255,255,0.08)"
                destructiveColor={colors.destructive}
              >
                <Text style={styles.spentAmount}>
                  {formatMoney(currentMonthSpent)}
                </Text>
                <Text style={styles.spentLabel}>spent</Text>
              </BudgetRing>

              <View style={styles.statsCol}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {monthlyBudget > 0 ? formatMoney(monthlyBudget) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Budget</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: isOverBudget ? colors.destructive : colors.primary },
                    ]}
                  >
                    {monthlyBudget > 0
                      ? `${isOverBudget ? '-' : '+'}${formatMoney(Math.abs(remaining))}`
                      : '—'}
                  </Text>
                  <Text style={styles.statLabel}>{isOverBudget ? 'Over' : 'Left'}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {currentMonthTransactions.length}
                  </Text>
                  <Text style={styles.statLabel}>Txns</Text>
                </View>
              </View>
            </View>

            {/* Budget bar */}
            {monthlyBudget > 0 && (
              <View style={styles.barWrap}>
                <View style={[styles.barTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${budgetPct * 100}%`,
                        backgroundColor: isOverBudget ? colors.destructive : colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barPct}>{Math.round(budgetPct * 100)}%</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Weekly Chart */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This Week</Text>
          <View style={{ overflow: 'hidden' }}>
            <WeeklyChart
              transactions={transactions.filter(t => t.type !== 'income' && !t.detectedCurrency)}
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No transactions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add one manually or enable notification access in Settings
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {recentTransactions.map(tx => (
              <TransactionRow key={tx.id} transaction={tx} onDelete={removeTransaction} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          { bottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 86 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Feather name="plus" size={22} color={colors.primaryForeground} />
      </Pressable>

      <ManualEntryModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      {/* Global currency picker */}
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        selected={currency.code}
        onSelect={handleCurrencySelect}
        onClose={() => setCurrencyPickerVisible(false)}
      />

      {/* Exchange rate prompt for global currency change */}
      <ExchangeRateModal
        visible={rateModalVisible}
        fromCode={currency.code}
        fromSymbol={currency.symbol}
        toCode={pendingCurrencyCode}
        toSymbol={pendingCurrency.symbol}
        onConfirm={handleRateConfirm}
        onCancel={handleRateCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,176,32,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#FFB020',
  },
  cardSection: {
    paddingHorizontal: 16,
    marginTop: -4,
  },
  spendingCard: {
    padding: 20,
    marginTop: 0,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currencyBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.85)',
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  spentAmount: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  spentLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  statsCol: {
    flex: 1,
    gap: 4,
  },
  statItem: {
    alignItems: 'flex-start',
    gap: 1,
    paddingVertical: 6,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  divider: {
    height: 1,
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barPct: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
    width: 34,
    textAlign: 'right',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 14,
  },
  recentHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  listWrap: {
    paddingHorizontal: 16,
  },
  empty: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
