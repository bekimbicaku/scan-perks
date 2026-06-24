import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { colors } from '@/theme';
import Constants from 'expo-constants';
import AppUpdateManager from '@/components/AppUpdateManager';
import AppSplash from '@/components/AppSplash';
import WebConfigError from '@/components/WebConfigError';
import WebErrorBoundary from '@/components/WebErrorBoundary';
import { getFirebaseConfigError, isFirebaseConfigured } from '@/lib/firebaseConfig';

export default function RootLayout() {
  const [isReady] = useFrameworkReady();
  const configError = getFirebaseConfigError();

  useEffect(() => {
    if (Constants.appOwnership === 'expo' || Platform.OS === 'web' || !isFirebaseConfigured()) {
      return;
    }

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

  const showStartupSplash = !isReady && Platform.OS !== 'web';

  if (configError) {
    return (
      <View style={{ flex: 1 }}>
        <WebConfigError message={configError} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.offWhite }}>
      <SafeAreaProvider>
        <WebErrorBoundary>
          {showStartupSplash ? (
            <AppSplash />
          ) : (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.offWhite } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="business/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="redeem" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
            </Stack>
          )}
          <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
          <AppUpdateManager />
        </WebErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
