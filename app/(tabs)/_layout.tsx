import { Tabs, Redirect } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, QrCode, Chrome, User } from 'lucide-react-native';
import React from 'react';
import { colors } from '@/theme';
import { useAuthGate } from '@/hooks/useAuthGate';

const TAB_CONTENT = 52;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : insets.bottom;
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: TAB_CONTENT + bottomPad,
          elevation: 8,
          shadowOpacity: 0.06,
        },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.offWhite },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: '/home',
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Chrome size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          href: '/scan',
          title: 'Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <QrCode size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          href: '/business',
          title: 'Business',
          tabBarIcon: ({ color, size, focused }) => (
            <Building2 size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: '/profile',
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
