import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CURRENCIES, Currency } from '@/utils/currencies';

interface CurrencyPickerModalProps {
  visible: boolean;
  selected: string; // currency code
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CurrencyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const colors = useColors();

  const renderItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === selected;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isSelected
              ? `${colors.primary}18`
              : pressed
              ? colors.muted
              : 'transparent',
            borderBottomColor: colors.border,
          },
        ]}
        onPress={() => {
          onSelect(item.code);
          onClose();
        }}
      >
        <View style={styles.symbolBox}>
          <Text style={[styles.symbol, { color: colors.primary }]}>{item.symbol}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.code, { color: colors.mutedForeground }]}>{item.code}</Text>
        </View>
        {isSelected && (
          <Feather name="check" size={16} color={colors.primary} />
        )}
      </Pressable>
    );
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
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Select Currency</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <FlatList
            data={CURRENCIES}
            keyExtractor={item => item.code}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            initialScrollIndex={Math.max(0, CURRENCIES.findIndex(c => c.code === selected))}
            getItemLayout={(_, index) => ({ length: 60, offset: 60 * index, index })}
          />
        </Pressable>
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
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  symbolBox: {
    width: 36,
    alignItems: 'center',
  },
  symbol: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  code: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});
