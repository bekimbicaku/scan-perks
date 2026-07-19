import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import AppSplash from '@/components/AppSplash';
import { useAuthGate } from '@/hooks/useAuthGate';
import { colors, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const authGate = useAuthGate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authGate.status === 'signedIn') {
      router.replace('/home');
    }
  }, [authGate.status]);

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
      router.replace('/home');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  if (authGate.status === 'signedIn') {
    return <AppSplash />;
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                returnKeyType="next"
                autoComplete="email"
              />
              <GlassInput
                icon={<Lock size={20} color={colors.textMuted} />}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                containerStyle={styles.inputGap}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                autoComplete="password"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={() => router.push('/forgot-password')}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={styles.forgotHit}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <GlassButton
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                icon={<ArrowRight size={20} color={colors.white} />}
                style={styles.button}
              />

              <TouchableOpacity
                onPress={() => router.push('/register')}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={styles.linkHit}
              >
                <Text style={styles.linkText}>Don't have an account? Create one</Text>
              </TouchableOpacity>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  header: { marginBottom: spacing.lg, alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h1, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  form: { gap: spacing.md },
  inputGap: { marginTop: spacing.sm },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
  forgotHit: { minHeight: 40, justifyContent: 'center' },
  forgotText: { color: colors.primaryDark, fontSize: 14, textAlign: 'right', fontWeight: '600' },
  button: { marginTop: spacing.sm },
  linkHit: { minHeight: 44, justifyContent: 'center', marginTop: spacing.xs },
  linkText: { color: colors.primaryDark, fontSize: 14, textAlign: 'center', fontWeight: '600' },
});
