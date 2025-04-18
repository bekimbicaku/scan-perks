import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Building2, QrCode, Chrome, User } from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 60,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#0891b2',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: '/',
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Chrome 
              size={size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          href: '/scan',
          title: 'Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <QrCode 
              size={size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          href: '/business',
          title: 'Business',
          tabBarIcon: ({ color, size, focused }) => (
            <Building2 
              size={size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: '/profile',
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User 
              size={size} 
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}