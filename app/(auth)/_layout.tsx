import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'fade',
        contentStyle: { backgroundColor: '#fff', width: '100%', maxWidth: '100%', overflow: 'hidden' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="enable-notifications" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}