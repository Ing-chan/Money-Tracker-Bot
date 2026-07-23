import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useBudget } from '@/context/BudgetContext';
import { useColors } from '@/hooks/useColors';
import { CurrencyPickerModal } from './CurrencyPickerModal';
import { ExchangeRateModal } from './ExchangeRateModal';
import { getCurrencyByCode } from '@/utils/currencies';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManualEntryModal({ visible, onClose }: ManualEntryModalProps) {
  const colors = useColors();
  const { addTransaction, currency: globalCurrency } = useBudget();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 'expense' subtracts from the remaining budget, 'income' adds to it.
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  // Currency picker state
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(globalCurrency.code);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  // Exchange rate modal state — shown when selected currency ≠ global currency
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const amountRef = useRef<TextInput>(null);

  // Keep selected currency in sync with global when modal re-opens
  useEffect(() => {
    if (visible) {
      setSelectedCurrencyCode(globalCurrency.code);
      setTimeout(() => amountRef.current?.focus(), 300);
    } else {
      setAmount('');
      setDescription('');
      setError('');
      setTxType('expense');
    }
  }, [visible, globalCurrency.code]);

  const selectedCurrency = getCurrencyByCode(selectedCurrencyCode);
  const needsConversion = selectedCurrencyCode !== globalCurrency.code;

  const handleSubmit = async () => {
    const raw = amount.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      setError(`Enter a valid amount greater than ${selectedCurrency.symbol}0`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (needsConversion) {
      // Show the exchange rate prompt; save the raw parsed amount for later
      setPendingAmount(parsed);
      setRateModalVisible(true);
      return;
    }

    // Same currency as global — save directly
    await save(parsed, undefined);
  };

  /**
   * Persist the transaction.
   * `amount`           — value already in the global currency (used for all budget maths).
   * `originalAmount`   — pre-conversion value the user typed (display only, optional).
   * `originalCurrency` — currency code of originalAmount (display only, optional).
   */
  const save = async (
    amount: number,
    originalAmount?: number,
    originalCurrency?: string,
  ) => {
    setSubmitting(true);
    await addTransaction(
      amount,
      description.trim() || (txType === 'income' ? 'Manual income' : 'Manual entry'),
      'manual',
      'manual',
      originalAmount,
      originalCurrency,
      txType,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    onClose();
  };

  const handleRateConfirm = async (rate: number) => {
    setRateModalVisible(false);
    // Convert: amount in selectedCurrency → amount in globalCurrency
    const convertedAmount = Math.round(pendingAmount * rate * 100) / 100;
    // Save the converted amount (in global currency) for maths, plus the original
    // amount and currency code for display purposes only.
    await save(convertedAmount, pendingAmount, selectedCurrencyCode);
  };

  const inputStyle = {
    backgroundColor: colors.input,
    color: colors.foreground,
    borderRadius: colors.radius,
    borderColor: colors.border,
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.kav}
          >
            <Pressable
              style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              {/* Handle */}
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              <Text style={[styles.title, { color: colors.foreground }]}>
                {txType === 'income' ? 'Add Income' : 'Add Expense'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Manually log a transaction
              </Text>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Expense / Income segmented toggle */}
                <View style={[styles.typeToggle, { borderColor: colors.border, borderRadius: colors.radius }]}>
                  {(['expense', 'income'] as const).map(t => {
                    const active = txType === t;
                    const activeBg = t === 'income' ? '#12B76A' : colors.primary;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTxType(t)}
                        style={[
                          styles.typeSeg,
                          {
                            backgroundColor: active ? activeBg : 'transparent',
                            borderRadius: colors.radius,
                          },
                        ]}
                      >
                        <Feather
                          name={t === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
                          size={14}
                          color={active ? colors.primaryForeground : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.typeSegText,
                            { color: active ? colors.primaryForeground : colors.mutedForeground },
                          ]}
                        >
                          {t === 'income' ? 'Income' : 'Expense'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>


                {/* Amount + Currency */}
                <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT</Text>
                <View style={styles.amountRow}>
                  {/* Tappable currency symbol */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.currencyBtn,
                      {
                        backgroundColor: pressed ? `${colors.primary}22` : `${colors.primary}12`,
                        borderColor: colors.primary,
                        borderRadius: colors.radius,
                      },
                    ]}
                    onPress={() => setCurrencyPickerVisible(true)}
                  >
                    <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                      {selectedCurrency.symbol}
                    </Text>
                    <Feather name="chevron-down" size={12} color={colors.primary} />
                  </Pressable>

                  {/* Amount input */}
                  <View style={[styles.amountWrap, inputStyle, { borderWidth: 1, flex: 1 }]}>
                    <TextInput
                      ref={amountRef}
                      value={amount}
                      onChangeText={v => { setAmount(v); setError(''); }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.amountInput, { color: colors.foreground }]}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Conversion note */}
                {needsConversion && (
                  <View style={[styles.conversionNote, { backgroundColor: `${colors.primary}10`, borderRadius: colors.radius }]}>
                    <Feather name="refresh-cw" size={12} color={colors.primary} />
                    <Text style={[styles.conversionText, { color: colors.primary }]}>
                      You'll be asked for the {selectedCurrencyCode} → {globalCurrency.code} rate before saving.
                    </Text>
                  </View>
                )}

                {error !== '' && (
                  <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
                )}

                {/* Description */}
                <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
                  DESCRIPTION (OPTIONAL)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Coffee, groceries…"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.descInput, inputStyle, { borderWidth: 1 }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                {/* Buttons */}
                <View style={styles.buttons}>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.addBtn,
                      { backgroundColor: txType === 'income' ? '#12B76A' : colors.primary, borderRadius: colors.radius, opacity: submitting ? 0.6 : 1 },
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    <Text style={[styles.addText, { color: colors.primaryForeground }]}>
                      {submitting ? 'Adding…' : txType === 'income' ? 'Add Income' : 'Add Expense'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Currency picker (rendered outside the main modal) */}
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        selected={selectedCurrencyCode}
        onSelect={setSelectedCurrencyCode}
        onClose={() => setCurrencyPickerVisible(false)}
      />

      {/* Exchange rate prompt */}
      <ExchangeRateModal
        visible={rateModalVisible}
        fromCode={selectedCurrencyCode}
        fromSymbol={selectedCurrency.symbol}
        toCode={globalCurrency.code}
        toSymbol={globalCurrency.symbol}
        onConfirm={handleRateConfirm}
        onCancel={() => setRateModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
    marginBottom: 18,
    gap: 3,
  },
  typeSeg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  typeSegText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    height: 52,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
  },
  conversionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    marginTop: 8,
  },
  conversionText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  error: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  descInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  addBtn: {
    flex: 2,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
