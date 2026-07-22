import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/context/BudgetContext';
import { TransactionRow } from '@/components/TransactionRow';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import type { Transaction } from '@/utils/notificationHandler';

interface Section {
  title: string;
  spent: number;
  income: number;
  data: Transaction[];
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, removeTransaction, refreshTransactions, formatMoney } = useBudget();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return transactions;
    const q = query.toLowerCase();
    return transactions.filter(
      t =>
        t.description.toLowerCase().includes(q) ||
        t.appName.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
    );
  }, [transactions, query]);

  const sections: Section[] = useMemo(() => {
    const map: Record<string, Section> = {};
    for (const tx of filtered) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!map[key]) map[key] = { title: label, spent: 0, income: 0, data: [] };
      map[key].data.push(tx);
      if (tx.detectedCurrency) continue; // amount isn't in the global currency, skip from totals
      if (tx.type === 'income') {
        map[key].income += tx.amount;
      } else {
        map[key].spent += tx.amount;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);
  }, [filtered]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.foreground }]}>History</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </Text>

        {/* Search bar */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== 'ios' && (
            <Pressable onPress={() => setQuery('')}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 20, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionMonth, { color: colors.foreground }]}>{section.title}</Text>
            <View style={styles.sectionTotals}>
              <Text style={[styles.sectionTotal, { color: colors.primary }]}>
                {formatMoney(section.spent)}
              </Text>
              {section.income > 0 && (
                <Text style={[styles.sectionIncome, { color: '#12B76A' }]}>
                  +{formatMoney(section.income)}
                </Text>
              )}
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow transaction={item} onDelete={removeTransaction} />
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="inbox" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {query ? 'No results found' : 'No transactions yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {query
                ? 'Try a different search term'
                : 'Add expenses manually or enable notification access'}
            </Text>
            {!query && (
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                  Add First Expense
                </Text>
              </Pressable>
            )}
          </View>
        }
        stickySectionHeadersEnabled
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  subheading: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionMonth: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTotals: {
    alignItems: 'flex-end',
  },
  sectionTotal: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  sectionIncome: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 1,
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
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
