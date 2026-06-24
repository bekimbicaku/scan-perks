import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { colors } from '@/theme';
import Constants from 'expo-constants';
import AppUpdateManager from '@/components/AppUpdateManager';

export default function RootLayout() {
  const [isReady] = useFrameworkReady();

  useEffect(() => {
    if (Constants.appOwnership === 'expo') return;

    let unsubscribe: (() => void) | undefined;

    import('@/lib/notifications')
      .then(({ configurePushNotifications, registerForPushNotifications }) => {
        configurePushNotifications();

        return import('@/lib/firebase').then(({ auth, onAuthStateChanged }) => {
          if (!auth) return;

          unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
              registerForPushNotifications().catch(console.error);
            }
          });
        });
      })
      .catch(console.error);

    return () => unsubscribe?.();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.offWhite } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="business/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="redeem" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
        <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
        <AppUpdateManager />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
