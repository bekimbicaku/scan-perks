import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Gift } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import DownloadAppButton from '@/components/DownloadAppButton';
import AppSplash from '@/components/AppSplash';
import { isValidReferralCode } from '@/lib/referral';
import { markWelcomeSeen, setPendingReferralCode } from '@/lib/onboarding';
import { REFERRAL_BONUS_SCANS } from '@/lib/engagement';
import { useAuthGate } from '@/hooks/useAuthGate';
import { colors, spacing, typography } from '@/theme';

export default function InviteLandingScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const authGate = useAuthGate();
  const [ready, setReady] = useState(false);
  const referralCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const valid = isValidReferralCode(referralCode);

  useEffect(() => {
    if (!valid) {
      setReady(true);
      return;
    }

    Promise.all([setPendingReferralCode(referralCode), markWelcomeSeen()]).finally(() => {
      setReady(true);
    });
  }, [referralCode, valid]);

  if (authGate.status === 'loading' || !ready) {
    return <AppSplash />;
  }

  if (authGate.status === 'signedIn') {
    return <Redirect href="/home" />;
  }

  if (!valid) {
    return <Redirect href="/welcome" />;
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <BrandLogo size="lg" />
          <GlassCard style={styles.card}>
            <View style={styles.iconWrap}>
              <Gift size={36} color={colors.success} />
            </View>
            <Text style={styles.title}>You are invited</Text>
            <Text style={styles.body}>
              A friend shared Scan Perks with you. Create your account and start with{' '}
              {REFERRAL_BONUS_SCANS} bonus scans.
            </Text>
            <View style={styles.codeChip}>
              <Text style={styles.codeLabel}>Invite code</Text>
              <Text style={styles.code}>{referralCode}</Text>
            </View>
            <GlassButton
              label="Join with this invite"
              onPress={() => router.replace(`/register?ref=${encodeURIComponent(referralCode)}`)}
            />
            <GlassButton label="I already have an account" onPress={() => router.replace('/login')} variant="ghost" />
          </GlassCard>
          <DownloadAppButton />
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  content: { gap: spacing.lg, alignItems: 'center' },
  card: { width: '100%', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center', lineHeight: 24 },
  codeChip: {
    width: '100%',
    backgroundColor: colors.glass.tint,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
  },
  codeLabel: { ...typography.label },
  code: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, letterSpacing: 2, marginTop: 4 },
});
