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
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, auth, getDb } from '@/lib/firebase';
import { generateReferralCode, isValidReferralCode } from '@/lib/referral';
import { processReferralSignup } from '@/lib/engagement';
import { trackSignUpConversion } from '@/lib/gtag';
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  markWelcomeSeen,
  setPendingReferralCode,
} from '@/lib/onboarding';
import { parseBirthdayInput } from '@/lib/birthday';
import { getPostAuthHref } from '@/lib/postAuth';
import { Mail, User, Lock, ArrowRight, Gift, Cake } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import DownloadAppButton from '@/components/DownloadAppButton';
import { colors, spacing, typography } from '@/theme';

export default function RegisterScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = typeof ref === 'string' ? ref.trim().toUpperCase() : '';
    if (fromUrl && isValidReferralCode(fromUrl)) {
      setReferralInput(fromUrl);
      setPendingReferralCode(fromUrl);
      return;
    }

    getPendingReferralCode().then((pending) => {
      if (pending) setReferralInput(pending);
    });
  }, [ref]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email, and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const birthdayParsed = birthday.trim() ? parseBirthdayInput(birthday) : null;
    if (birthday.trim() && !birthdayParsed) {
      setError('Birthday should look like 05-14');
      return;
    }

    if (referralInput && !isValidReferralCode(referralInput)) {
      setError('That invite code does not look right');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      const referralCode = generateReferralCode(uid);
      const referredBy = referralInput.trim().toUpperCase() || null;

      await setDoc(doc(getDb(), 'users', uid), {
        name: name.trim(),
        surname: '',
        email: email.trim(),
        createdAt: new Date(),
        type: 'customer',
        referralCode,
        referredBy,
        referralBonusScans: 0,
        favorites: [],
        scanStreak: 0,
        longestStreak: 0,
        notificationsEnabled: false,
        birthdayMonth: birthdayParsed?.month || null,
        birthdayDay: birthdayParsed?.day || null,
      });

      if (referredBy) {
        await processReferralSignup(uid, referredBy);
      }

      await Promise.all([trackSignUpConversion(), markWelcomeSeen(), clearPendingReferralCode()]);
      router.replace(await getPostAuthHref());
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('email-already-in-use')) {
        setError('That email already has an account. Try signing in.');
      } else if (message.includes('invalid-email')) {
        setError('Please enter a valid email address');
      } else if (message.includes('weak-password')) {
        setError('Please choose a stronger password');
      } else {
        setError('Could not create your account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <BrandLogo size="sm" />
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                One minute to start scanning, collecting stamps, and unlocking rewards.
              </Text>
            </View>

            {referralInput && isValidReferralCode(referralInput) ? (
              <View style={styles.inviteBanner}>
                <Gift size={16} color={colors.success} />
                <Text style={styles.inviteBannerText}>Invite applied: {referralInput}</Text>
              </View>
            ) : null}

            <GlassCard style={styles.form}>
              <GlassInput
                icon={<User size={20} color={colors.textMuted} />}
                placeholder="First name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                autoComplete="given-name"
              />
              <GlassInput
                icon={<Mail size={20} color={colors.textMuted} />}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                containerStyle={styles.gap}
                returnKeyType="next"
                autoComplete="email"
              />
              <GlassInput
                icon={<Lock size={20} color={colors.textMuted} />}
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                containerStyle={styles.gap}
                returnKeyType="next"
                autoComplete="new-password"
              />
              <GlassInput
                icon={<Cake size={20} color={colors.textMuted} />}
                placeholder="Birthday MM-DD (optional, for treats)"
                value={birthday}
                onChangeText={setBirthday}
                keyboardType="numbers-and-punctuation"
                containerStyle={styles.gap}
                returnKeyType="next"
              />
              <GlassInput
                icon={<Gift size={20} color={colors.textMuted} />}
                placeholder="Invite code (optional)"
                value={referralInput}
                onChangeText={setReferralInput}
                autoCapitalize="characters"
                containerStyle={styles.gap}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <GlassButton
                label="Get started"
                onPress={handleRegister}
                loading={loading}
                icon={<ArrowRight size={20} color={colors.white} />}
                style={styles.button}
              />

              <TouchableOpacity
                onPress={() => router.push('/login')}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={styles.linkHit}
              >
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </GlassCard>

            <View style={styles.downloadWrap}>
              <DownloadAppButton />
            </View>
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
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.h1, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  inviteBannerText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  form: { gap: spacing.sm },
  gap: { marginTop: spacing.sm },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  button: { marginTop: spacing.md },
  linkHit: { minHeight: 44, justifyContent: 'center', marginTop: spacing.sm },
  linkText: {
    color: colors.primaryDark,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  downloadWrap: { marginTop: spacing.lg },
});
