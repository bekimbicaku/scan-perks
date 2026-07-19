import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, auth, getDb } from '@/lib/firebase';
import { generateReferralCode, isValidReferralCode } from '@/lib/referral';
import { processReferralSignup } from '@/lib/engagement';
import { registerForPushNotifications } from '@/lib/notifications';
import { Mail, User, Lock, ArrowRight, Gift } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import { colors, spacing, typography } from '@/theme';

export default function RegisterScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof ref === 'string' && ref) {
      setReferralInput(ref.toUpperCase());
    }
  }, [ref]);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (referralInput && !isValidReferralCode(referralInput)) {
      setError('Invalid referral code format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const referralCode = generateReferralCode(uid);

      await setDoc(doc(getDb(), 'users', uid), {
        name,
        surname,
        email,
        createdAt: new Date(),
        type: 'customer',
        referralCode,
        referredBy: referralInput.trim().toUpperCase() || null,
        referralBonusScans: 0,
        favorites: [],
        scanStreak: 0,
        longestStreak: 0,
      });

      if (referralInput.trim()) {
        await processReferralSignup(uid, referralInput.trim());
      }

      registerForPushNotifications().catch(console.error);
      router.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Scan Perks and start earning rewards worldwide!</Text>
          </View>

          <GlassCard style={styles.form}>
            <GlassInput
              icon={<User size={20} color={colors.textMuted} />}
              placeholder="Name *"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <GlassInput
              icon={<User size={20} color={colors.textMuted} />}
              placeholder="Surname (Optional)"
              value={surname}
              onChangeText={setSurname}
              autoCapitalize="words"
              containerStyle={styles.gap}
            />
            <GlassInput
              icon={<Mail size={20} color={colors.textMuted} />}
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              containerStyle={styles.gap}
            />
            <GlassInput
              icon={<Lock size={20} color={colors.textMuted} />}
              placeholder="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.gap}
            />
            <GlassInput
              icon={<Gift size={20} color={colors.textMuted} />}
              placeholder="Referral Code (Optional)"
              value={referralInput}
              onChangeText={setReferralInput}
              autoCapitalize="characters"
              containerStyle={styles.gap}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GlassButton
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              icon={<ArrowRight size={20} color={colors.white} />}
              style={styles.button}
            />

            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
  header: { marginBottom: spacing.lg, alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  title: { ...typography.h1, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  form: { gap: spacing.sm },
  gap: { marginTop: spacing.sm },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  button: { marginTop: spacing.md },
  linkText: { color: colors.primaryDark, fontSize: 14, textAlign: 'center', marginTop: spacing.md },
});
