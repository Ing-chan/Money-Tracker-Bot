import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import * as Haptics from 'expo-haptics';
import { useBudget } from '@/context/BudgetContext';
import { useColors } from '@/hooks/useColors';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManualEntryModal({ visible, onClose }: ManualEntryModalProps) {
  const colors = useColors();
  const { addTransaction } = useBudget();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => amountRef.current?.focus(), 300);
    } else {
      setAmount('');
      setDescription('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    const raw = amount.replace(/[$,\s]/g, '');
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than $0');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    await addTransaction(parsed, description.trim() || 'Manual entry', 'manual');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    onClose();
  };

  const inputStyle = {
    backgroundColor: colors.input,
    color: colors.foreground,
    borderRadius: colors.radius,
    borderColor: colors.border,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {}}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, { color: colors.foreground }]}>Add Expense</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Manually log a transaction
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT</Text>
              <View style={[styles.amountWrap, inputStyle, { borderWidth: 1 }]}>
                <Text style={[styles.dollar, { color: colors.primary }]}>$</Text>
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
                    { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: submitting ? 0.6 : 1 },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={[styles.addText, { color: colors.primaryForeground }]}>
                    {submitting ? 'Adding…' : 'Add Expense'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
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
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    gap: 4,
  },
  dollar: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
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
