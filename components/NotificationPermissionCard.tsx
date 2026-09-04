import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Bell, BellOff, Check } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import {
  canUsePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
  openSystemNotificationSettings,
  type PushPermissionStatus,
} from '@/lib/notifications';
import { markNotificationsPromptSeen } from '@/lib/onboarding';
import { colors, spacing, typography } from '@/theme';

interface NotificationPermissionCardProps {
  compact?: boolean;
}

export default function NotificationPermissionCard({ compact }: NotificationPermissionCardProps) {
  const [status, setStatus] = useState<PushPermissionStatus>('unsupported');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!canUsePushNotifications()) {
      setStatus('unsupported');
      return;
    }

    getPushPermissionStatus().then(setStatus);
  }, []);

  if (Platform.OS === 'web' || status === 'unsupported' || status === 'granted' || dismissed) {
    return null;
  }

  const handleAllow = async () => {
    setLoading(true);
    try {
      if (status === 'denied') {
        await openSystemNotificationSettings();
        return;
      }

      await enablePushNotifications();
      const next = await getPushPermissionStatus();
      setStatus(next);
      await markNotificationsPromptSeen();
    } finally {
      setLoading(false);
    }
  };

  const handleLater = async () => {
    setDismissed(true);
    await markNotificationsPromptSeen();
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        {status === 'denied' ? (
          <BellOff size={22} color={colors.warning} />
        ) : (
          <Bell size={22} color={colors.primaryDark} />
        )}
        <Text style={styles.title}>
          {status === 'denied' ? 'Notifications are off' : 'Turn on notifications'}
        </Text>
      </View>
      {!compact ? (
        <Text style={styles.desc}>
          Get stamp reminders, nearby offers, and reward alerts on this phone. You can change this
          anytime in Settings.
        </Text>
      ) : null}

      <GlassButton
        label={status === 'denied' ? 'Open Settings' : 'Allow notifications'}
        onPress={handleAllow}
        loading={loading}
        icon={<Check size={18} color={colors.white} />}
      />
      {status !== 'denied' ? (
        <GlassButton label="Not now" onPress={handleLater} variant="ghost" />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h3, flex: 1 },
  desc: { ...typography.caption, lineHeight: 20 },
});
