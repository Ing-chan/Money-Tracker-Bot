import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';

// How far the dialog rises when the keyboard shows (~2-3cm). Tweak to taste.
const EXCHANGE_MODAL_LIFT = 90;

interface ExchangeRateModalProps {
  visible: boolean;
  fromCode: string;
  fromSymbol: string;
  toCode: string;
  toSymbol: string;
  subtitle?: string;
  /** Called with the exchange rate when the user confirms. */
  onConfirm: (rate: number) => void;
  onCancel: () => void;
}

/**
 * Prompts the user to enter the current exchange rate between two currencies.
 * Shows a mid-screen dialog: "1 [FROM] = __ [TO]"
 */
export function ExchangeRateModal({
  visible,
  fromCode,
  fromSymbol,
  toCode,
  toSymbol,
  subtitle,
  onConfirm,
  onCancel,
}: ExchangeRateModalProps) {
  const colors = useColors();
  const [rateInput, setRateInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { progress } = useReanimatedKeyboardAnimation();
  const liftStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [0, -EXCHANGE_MODAL_LIFT], Extrapolation.CLAMP),
      },
    ],
  }));

  useEffect(() => {
    if (visible) {
      setRateInput('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleConfirm = () => {
    const rate = parseFloat(rateInput.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid positive rate.');
      return;
    }
    onConfirm(rate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[styles.dialog, liftStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Exchange Rate</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle ?? 'Enter the current rate so amounts can be converted correctly.'}
          </Text>

          <View style={styles.equation}>
            <View style={[styles.pill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pillText, { color: colors.foreground }]}>
                1 {fromCode} {fromSymbol}
              </Text>
            </View>
            <Text style={[styles.eq, { color: colors.mutedForeground }]}>=</Text>
            <View
              style={[
                styles.rateInput,
                { backgroundColor: colors.input, borderColor: error ? colors.destructive : colors.border },
              ]}
            >
              <TextInput
                ref={inputRef}
                value={rateInput}
                onChangeText={v => { setRateInput(v); setError(''); }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.rateText, { color: colors.foreground }]}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
            </View>
            <View style={[styles.pill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pillText, { color: colors.foreground }]}>
                {toCode} {toSymbol}
              </Text>
            </View>
          </View>

          {error !== '' && (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>Apply</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  equation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  eq: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
  },
  rateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    minWidth: 80,
    justifyContent: 'center',
  },
  rateText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    padding: 0,
  },
  error: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
