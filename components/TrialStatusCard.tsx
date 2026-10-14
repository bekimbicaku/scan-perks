import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import { remainingTrialDays, STARTER_PRICE } from '@/lib/trial';
import { colors, spacing, typography } from '@/theme';

interface TrialStatusCardProps {
  trialEndsAt: Date | null;
  loading?: boolean;
  error?: string | null;
  onSubscribe: () => void;
}

export default function TrialStatusCard({
  trialEndsAt,
  loading,
  error,
  onSubscribe,
}: TrialStatusCardProps) {
  const daysLeft = remainingTrialDays(trialEndsAt);
  const ended = daysLeft <= 0;
  const endLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>{ended ? 'Trial ended' : 'Starter trial'}</Text>
      <Text style={styles.body}>
        {ended
          ? `The 14-day trial is over. Starter is $${STARTER_PRICE}/month to keep the QR working.`
          : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Starter is $${STARTER_PRICE}/month after ${endLabel}. No card yet.`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GlassButton
        label={loading ? 'Opening checkout...' : ended ? 'Start Starter' : 'Add a card for Starter'}
        onPress={onSubscribe}
        loading={loading}
        disabled={loading}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  title: { ...typography.h3 },
  body: { ...typography.body, lineHeight: 22 },
  error: { color: colors.error, fontSize: 14 },
});
