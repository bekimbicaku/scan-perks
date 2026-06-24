import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import { colors, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      registerForPushNotifications().catch(console.error);
      router.replace('/(tabs)/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo size="sm" />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access your rewards</Text>
          </View>

          <GlassCard style={styles.form}>
            <GlassInput
              icon={<Mail size={20} color={colors.textMuted} />}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <GlassInput
              icon={<Lock size={20} color={colors.textMuted} />}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.inputGap}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <GlassButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              icon={<ArrowRight size={20} color={colors.white} />}
              style={styles.button}
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Don't have an account? Create one</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  header: { marginBottom: spacing.lg, alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h1, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  form: { gap: spacing.md },
  inputGap: { marginTop: spacing.sm },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
  forgotText: { color: colors.primaryDark, fontSize: 14, textAlign: 'right' },
  button: { marginTop: spacing.sm },
  linkText: { color: colors.primaryDark, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
});
