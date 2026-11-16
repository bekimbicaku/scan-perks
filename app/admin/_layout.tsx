import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthGate } from '@/hooks/useAuthGate';
import { isPlatformAdmin } from '@/lib/adminAccess';
import { stamp, outfit } from '@/theme';

export default function AdminLayout() {
  const authGate = useAuthGate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    async function check() {
      if (authGate.status === 'loading') return;

      if (authGate.status === 'signedOut') {
        if (alive) setAllowed(false);
        router.replace('/login');
        return;
      }

      const ok = await isPlatformAdmin(authGate.user);
      if (!alive) return;
      setAllowed(ok);
      if (!ok) {
        router.replace('/home');
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [authGate]);

  if (authGate.status === 'loading' || allowed === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={stamp.sky} />
        <Text style={styles.hint}>Checking admin access…</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Admin access required</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: stamp.mist } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="promo" />
      <Stack.Screen name="business/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stamp.mist,
    gap: 12,
    padding: 24,
  },
  hint: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
  },
  denied: {
    fontFamily: outfit.semibold,
    fontSize: 16,
    color: stamp.danger,
  },
});
