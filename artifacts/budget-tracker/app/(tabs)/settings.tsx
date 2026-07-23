import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/context/BudgetContext';
import { CurrencyPickerModal } from '@/components/CurrencyPickerModal';
import { ExchangeRateModal } from '@/components/ExchangeRateModal';
import { getCurrencyByCode } from '@/utils/currencies';

const BANKING_PRESETS = [
  // ── Italian / European ──────────────────────────────────────────────────
  { displayName: 'Intesa Sanpaolo', packageName: 'com.latuabancaperandroid' },
  { displayName: 'Trade Republic', packageName: 'de.traderepublic.app' },
  // ── US banks & wallets ──────────────────────────────────────────────────
  { displayName: 'Chase', packageName: 'com.chase.sig.android' },
  { displayName: 'Bank of America', packageName: 'com.infonow.bofa' },
  { displayName: 'Wells Fargo', packageName: 'com.wf.wellsfargomobile' },
  { displayName: 'Citi', packageName: 'com.citi.citimobile' },
  { displayName: 'Capital One', packageName: 'com.konylabs.capitalone' },
  { displayName: 'Discover', packageName: 'com.discoverfinancial.mobile' },
  { displayName: 'Amex', packageName: 'com.americanexpress.android.acctsvcs.us' },
  { displayName: 'USAA', packageName: 'com.usaa.mobile.android.usaa' },
  { displayName: 'TD Bank', packageName: 'com.tdbank' },
  { displayName: 'US Bank', packageName: 'com.usbank.mobilebanking' },
  { displayName: 'Navy Federal', packageName: 'com.navyfederal.android' },
  { displayName: 'Venmo', packageName: 'com.venmo' },
  { displayName: 'Cash App', packageName: 'com.squareup.cash' },
  { displayName: 'PayPal', packageName: 'com.paypal.android.p2pmobile' },
  { displayName: 'Zelle', packageName: 'com.zellepay.zelle' },
  { displayName: 'SoFi', packageName: 'com.sofi.banking' },
];

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <Feather name={icon as any} size={15} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    bankingApps,
    monthlyBudget,
    permissionStatus,
    transactions,
    currency,
    setGlobalCurrency,
    addBankingApp,
    removeBankingApp,
    setMonthlyBudget,
    openNotificationSettings,
    exportCsv,
    clearAllData,
  } = useBudget();

  const [customPkg, setCustomPkg] = useState('');
  const [customName, setCustomName] = useState('');
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [budgetEditing, setBudgetEditing] = useState(false);

  // Currency flow
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [pendingCurrencyCode, setPendingCurrencyCode] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleAddCustom = async () => {
    const pkg = customPkg.trim();
    const name = customName.trim();
    if (!pkg || !name) {
      Alert.alert('Missing info', 'Please enter both a package name and a display name.');
      return;
    }
    await addBankingApp(pkg, name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomPkg('');
    setCustomName('');
  };

  const handleRemoveApp = (packageName: string, displayName: string) => {
    Alert.alert('Remove App', `Stop tracking notifications from ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeBankingApp(packageName),
      },
    ]);
  };

  const handleSaveBudget = async () => {
    const parsed = parseFloat(budgetInput.replace(/[^\d.]/g, ''));
    if (!isNaN(parsed) && parsed >= 0) {
      await setMonthlyBudget(parsed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setBudgetEditing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Transactions',
      `This will permanently delete all ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleCurrencySelect = (code: string) => {
    if (code === currency.code) return;
    setPendingCurrencyCode(code);
    // Always ask for a rate: the budget needs converting regardless of
    // whether there are any transactions yet.
    setRateModalVisible(true);
  };

  const handleRateConfirm = async (rate: number) => {
    setRateModalVisible(false);
    await setGlobalCurrency(pendingCurrencyCode, rate);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pendingCurrency = pendingCurrencyCode ? getCurrencyByCode(pendingCurrencyCode) : currency;

  const permissionColor =
    permissionStatus === 'authorized'
      ? colors.primary
      : permissionStatus === 'denied'
      ? colors.destructive
      : '#FFB020';

  const permissionIcon =
    permissionStatus === 'authorized'
      ? 'check-circle'
      : permissionStatus === 'denied'
      ? 'x-circle'
      : 'alert-circle';

  const permissionLabel =
    permissionStatus === 'authorized'
      ? 'Active — notifications are being monitored'
      : permissionStatus === 'denied'
      ? 'Denied — tap below to open settings'
      : 'Not set up — tap below to enable';

  const availablePresets = BANKING_PRESETS.filter(
    p => !bankingApps.some(b => b.packageName === p.packageName)
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.heading, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20, gap: 12 }}
      >
        {/* ── Currency ── */}
        <SectionCard>
          <SectionHeader icon="globe" title="Currency" />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Tap to change your default currency. If you have existing transactions, you'll be asked
            for the current exchange rate and all amounts will be converted.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.currencyRow,
              {
                backgroundColor: colors.muted,
                borderRadius: colors.radius,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={() => setCurrencyPickerVisible(true)}
          >
            <View style={styles.currencyLeft}>
              <Text style={[styles.currencySymbolLarge, { color: colors.primary }]}>
                {currency.symbol}
              </Text>
              <View>
                <Text style={[styles.currencyName, { color: colors.foreground }]}>
                  {currency.name}
                </Text>
                <Text style={[styles.currencyCode, { color: colors.mutedForeground }]}>
                  {currency.code}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </SectionCard>

        {/* ── Notification Access ── */}
        <SectionCard>
          <SectionHeader icon="bell" title="Notification Access" />
          <View style={styles.permRow}>
            <Feather name={permissionIcon as any} size={18} color={permissionColor} />
            <Text style={[styles.permLabel, { color: permissionColor }]}>{permissionLabel}</Text>
          </View>
          {permissionStatus !== 'authorized' && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={openNotificationSettings}
            >
              <Feather name="external-link" size={14} color={colors.primaryForeground} />
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                Open Notification Access Settings
              </Text>
            </Pressable>
          )}
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            On Android: Settings → Apps → Special app access → Notification access → enable{' '}
            <Text style={{ fontFamily: 'Inter_500Medium' }}>Budget Tracker</Text>
          </Text>
        </SectionCard>

        {/* ── Banking Apps ── */}
        <SectionCard>
          <SectionHeader icon="credit-card" title="Banking Apps to Track" />

          {/* Added apps */}
          {bankingApps.length === 0 ? (
            <Text style={[styles.emptyApps, { color: colors.mutedForeground }]}>
              No apps added yet — pick from the list below or enter a custom package name.
            </Text>
          ) : (
            <View style={styles.appsList}>
              {bankingApps.map(app => (
                <View
                  key={app.packageName}
                  style={[styles.appRow, { backgroundColor: colors.muted, borderRadius: 10 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appName, { color: colors.foreground }]}>
                      {app.displayName}
                    </Text>
                    <Text style={[styles.appPkg, { color: colors.mutedForeground }]}>
                      {app.packageName}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveApp(app.packageName, app.displayName)}>
                    <Feather name="x" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Quick-add presets */}
          {availablePresets.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Quick add popular apps
              </Text>
              <View style={styles.presetWrap}>
                {availablePresets.map(preset => (
                  <Pressable
                    key={preset.packageName}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                        borderRadius: 20,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => {
                      addBankingApp(preset.packageName, preset.displayName);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Feather name="plus" size={12} color={colors.primary} />
                    <Text style={[styles.presetText, { color: colors.foreground }]}>
                      {preset.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Custom app entry */}
          <Text style={[styles.subLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
            Custom app (package name)
          </Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Display name (e.g. My Bank)"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.textInput,
              { backgroundColor: colors.input, color: colors.foreground, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          />
          <TextInput
            value={customPkg}
            onChangeText={setCustomPkg}
            placeholder="Package name (e.g. com.mybank.app)"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.textInput,
              { backgroundColor: colors.input, color: colors.foreground, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          />
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleAddCustom}
          >
            <Feather name="plus" size={14} color={colors.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Add App</Text>
          </Pressable>
        </SectionCard>

        {/* ── Monthly Budget ── */}
        <SectionCard>
          <SectionHeader icon="target" title="Monthly Budget" />
          {budgetEditing ? (
            <View style={styles.budgetEdit}>
              <View style={[styles.budgetInput, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.dollar, { color: colors.primary }]}>{currency.symbol}</Text>
                <TextInput
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={[styles.budgetTextInput, { color: colors.foreground }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveBudget}
                />
              </View>
              <View style={styles.budgetBtns}>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                  onPress={() => { setBudgetEditing(false); setBudgetInput(monthlyBudget.toString()); }}
                >
                  <Text style={[styles.smallBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={handleSaveBudget}
                >
                  <Text style={[styles.smallBtnText, { color: colors.primaryForeground }]}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.budgetDisplay, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
              onPress={() => { setBudgetEditing(true); setBudgetInput(monthlyBudget.toString()); }}
            >
              <Text style={[styles.budgetValue, { color: colors.foreground }]}>
                {currency.symbol}{monthlyBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <Text style={[styles.budgetSub, { color: colors.mutedForeground }]}> / month</Text>
              </Text>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </SectionCard>

        {/* ── Data ── */}
        <SectionCard>
          <SectionHeader icon="database" title="Data" />
          <Pressable
            style={({ pressed }) => [
              styles.dataRow,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={exportCsv}
            disabled={transactions.length === 0}
          >
            <View style={[styles.dataIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="share-2" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataLabel, { color: colors.foreground }]}>Export as CSV</Text>
              <Text style={[styles.dataSub, { color: colors.mutedForeground }]}>
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dataRow,
              { borderColor: colors.border, borderTopWidth: 1, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleClearData}
            disabled={transactions.length === 0}
          >
            <View style={[styles.dataIcon, { backgroundColor: `${colors.destructive}18` }]}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataLabel, { color: colors.destructive }]}>
                Clear All Transactions
              </Text>
              <Text style={[styles.dataSub, { color: colors.mutedForeground }]}>
                Cannot be undone
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </SectionCard>
      </ScrollView>

      {/* Currency picker modal */}
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        selected={currency.code}
        onSelect={handleCurrencySelect}
        onClose={() => setCurrencyPickerVisible(false)}
      />

      {/* Exchange rate modal */}
      <ExchangeRateModal
        visible={rateModalVisible}
        fromCode={currency.code}
        fromSymbol={currency.symbol}
        toCode={pendingCurrencyCode}
        toSymbol={pendingCurrency.symbol}
        onConfirm={handleRateConfirm}
        onCancel={() => { setRateModalVisible(false); setPendingCurrencyCode(''); }}
      />
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  currencySymbolLarge: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    width: 36,
    textAlign: 'center',
  },
  currencyName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  currencyCode: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  emptyApps: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  appsList: {
    gap: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  appName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  appPkg: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  budgetEdit: {
    gap: 10,
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    gap: 4,
  },
  dollar: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
  },
  budgetBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  budgetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  budgetValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  budgetSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  dataSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});
