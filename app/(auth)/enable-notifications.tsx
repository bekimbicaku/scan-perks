import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, Gift, MapPin } from 'lucide-react-native';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import {
  canUsePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
  openSystemNotificationSettings,
  type PushPermissionStatus,
} from '@/lib/notifications';
import { markNotificationsPromptSeen } from '@/lib/onboarding';
import { colors, spacing, typography } from '@/theme';

export default function EnableNotificationsScreen() {
  const [status, setStatus] = useState<PushPermissionStatus>('undetermined');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canUsePushNotifications()) {
      finish();
      return;
    }

    getPushPermissionStatus().then((next) => {
      if (next === 'granted' || next === 'unsupported') {
        finish();
        return;
      }
      setStatus(next);
    });
  }, []);

  const finish = async () => {
    await markNotificationsPromptSeen();
    router.replace('/home');
  };

  const handleAllow = async () => {
    setLoading(true);
    try {
      if (status === 'denied') {
        await openSystemNotificationSettings();
        return;
      }
      await enablePushNotifications();
    } finally {
      setLoading(false);
      await finish();
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <BrandLogo size="md" />
          <GlassCard style={styles.card}>
            <View style={styles.iconWrap}>
              <Bell size={36} color={colors.primaryDark} />
            </View>
            <Text style={styles.title}>Stay in the loop</Text>
            <Text style={styles.body}>
              Allow notifications so you never miss a stamp reminder, nearby offer, or reward that is
              ready to redeem.
            </Text>

            <View style={styles.perks}>
              <View style={styles.perk}>
                <Gift size={18} color={colors.success} />
                <Text style={styles.perkText}>Reward alerts when you hit a free item</Text>
              </View>
              <View style={styles.perk}>
                <MapPin size={18} color={colors.primaryDark} />
                <Text style={styles.perkText}>Offers from places you already scan</Text>
              </View>
            </View>

            <GlassButton
              label={status === 'denied' ? 'Open Settings' : 'Allow notifications'}
              onPress={handleAllow}
              loading={loading}
            />
            <GlassButton label="Maybe later" onPress={finish} variant="ghost" />
          </GlassCard>
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
    backgroundColor: colors.glass.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center', lineHeight: 24 },
  perks: { width: '100%', gap: spacing.sm },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.tint,
    borderRadius: 14,
    padding: spacing.md,
  },
  perkText: { ...typography.caption, flex: 1, color: colors.navy },
});
