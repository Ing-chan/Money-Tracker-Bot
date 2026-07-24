import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/context/BudgetContext';

/**
 * Wraps the app content and requires a biometric (or device passcode) check
 * before showing anything, whenever the "Biometric Lock" setting is on.
 * Re-locks every time the app returns to the foreground after being
 * backgrounded, not just on cold start.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { biometricLockEnabled } = useBudget();
  const colors = useColors();
  const [unlocked, setUnlocked] = useState(!biometricLockEnabled);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  const tryUnlock = useCallback(async () => {
    setAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Device can't do biometrics (or none enrolled) — don't trap the
        // user out of their own data over a device limitation.
        setUnlocked(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Budget Tracker',
        disableDeviceFallback: false,
      });
      if (result.success) setUnlocked(true);
    } finally {
      setAuthenticating(false);
    }
  }, []);

  useEffect(() => {
    if (biometricLockEnabled) {
      setUnlocked(false);
      tryUnlock();
    } else {
      setUnlocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasBackgrounded = /inactive|background/.test(appState.current);
      if (wasBackgrounded && next === 'active' && biometricLockEnabled) {
        setUnlocked(false);
        tryUnlock();
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, [biometricLockEnabled, tryUnlock]);

  if (unlocked) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Feather name="lock" size={40} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>Budget Tracker Locked</Text>
      {authenticating ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={tryUnlock}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Unlock</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
