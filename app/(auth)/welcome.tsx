import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { QrCode, Gift, Globe } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import DownloadAppButton from '@/components/DownloadAppButton';
import { markWelcomeSeen } from '@/lib/onboarding';
import { colors, spacing, typography } from '@/theme';

const SLIDES = [
  {
    icon: QrCode,
    title: 'Scan at local spots',
    body: 'Point your camera at a business QR code. Each scan adds a stamp toward a free reward.',
  },
  {
    icon: Gift,
    title: 'Unlock real rewards',
    body: 'Collect stamps, keep a streak, and redeem offers at cafes, shops, and venues nearby.',
  },
  {
    icon: Globe,
    title: 'Invite friends, earn more',
    body: 'Share your link on WhatsApp. Friends get bonus scans, and you earn extra perks too.',
  },
];

export default function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const last = index === SLIDES.length - 1;

  const finish = async (href: '/register' | '/login') => {
    await markWelcomeSeen();
    router.replace(href);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <BrandLogo size="lg" />
          <Text style={styles.kicker}>Loyalty that travels with you</Text>

          <GlassCard style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon size={36} color={colors.primaryDark} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.actions}>
          <DownloadAppButton />
          {last ? (
            <GlassButton label="Create free account" onPress={() => finish('/register')} />
          ) : (
            <GlassButton label="Continue" onPress={() => setIndex((i) => i + 1)} />
          )}
          <TouchableOpacity onPress={() => finish('/login')} style={styles.linkHit}>
            <Text style={styles.linkText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  content: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  kicker: { ...typography.caption, textAlign: 'center' },
  card: { width: '100%', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.glass.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, textAlign: 'center', fontSize: 26 },
  body: { ...typography.body, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightBlue,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primaryDark,
  },
  actions: { gap: spacing.sm, paddingBottom: spacing.md },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  linkText: {
    color: colors.primaryDark,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});
