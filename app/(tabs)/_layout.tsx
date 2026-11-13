import { Tabs, Redirect } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import React from 'react';
import { colors, stamp } from '@/theme';
import { useAuthGate } from '@/hooks/useAuthGate';
import StampTabBar from '@/components/StampTabBar';

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const authGate = useAuthGate();

  if (authGate.status === 'loading') {
    // Keep tabs from flashing; login is shown after short timeout if needed
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite }}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  if (authGate.status === 'signedOut') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <StampTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 104,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: stamp.mist,
          ...(isWeb ? { overflow: 'hidden' as const, flex: 1 } : null),
        },
      }}
    >
      <Tabs.Screen name="home" options={{ href: '/home', title: 'Home' }} />
      <Tabs.Screen
        name="scan"
        options={{
          href: '/scan',
          title: 'Scan',
          sceneStyle: { backgroundColor: stamp.scanBg },
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          href: '/business',
          title: 'Business',
          sceneStyle: { backgroundColor: stamp.mistBusiness },
        }}
      />
      <Tabs.Screen name="profile" options={{ href: '/profile', title: 'Profile' }} />
    </Tabs>
  );
}
