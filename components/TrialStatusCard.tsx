import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import { remainingTrialDays, STARTER_PRICE } from '@/lib/trial';
import { stamp, outfit } from '@/theme';

interface TrialStatusCardProps {
  trialEndsAt: Date | null;
  loading?: boolean;
  error?: string | null;
  onSubscribe: () => void;
  variant?: 'full' | 'slim';
}

export default function TrialStatusCard({
  trialEndsAt,
  loading,
  error,
  onSubscribe,
  variant = 'full',
}: TrialStatusCardProps) {
  const daysLeft = remainingTrialDays(trialEndsAt);
  const ended = daysLeft <= 0;
  const endLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const actionLabel = loading ? 'Opening checkout...' : ended ? 'Start Starter' : 'Add a card for Starter';

  if (variant === 'slim') {
    return (
      <View style={styles.slim}>
        <TriangleAlert size={18} color={stamp.amberText} />
        <Text style={styles.slimText} numberOfLines={2}>
          {ended
            ? `Trial ended · $${STARTER_PRICE}/mo keeps your QR working`
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · Starter is $${STARTER_PRICE}/mo`}
        </Text>
        <TouchableOpacity
          style={styles.slimButton}
          onPress={onSubscribe}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.slimButtonText}>{ended ? 'Start' : 'Add card'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GlassCard stamp style={styles.card}>
      <View style={styles.titleRow}>
        <TriangleAlert size={18} color={stamp.amberText} />
        <Text style={styles.title}>{ended ? 'Trial ended' : 'Starter trial'}</Text>
      </View>
      <Text style={styles.body}>
        {ended
          ? `The 14-day trial is over. Starter is $${STARTER_PRICE}/month to keep the QR working.`
          : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Starter is $${STARTER_PRICE}/month after ${endLabel}. No card yet.`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GlassButton
        appearance="stamp"
        label={actionLabel}
        onPress={onSubscribe}
        loading={loading}
        disabled={loading}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
    backgroundColor: stamp.amberBg,
    borderColor: '#F3D48A',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: outfit.extra, fontSize: 18, color: stamp.amberText },
  body: { fontFamily: outfit.regular, fontSize: 15, lineHeight: 22, color: stamp.ink },
  error: { color: stamp.danger, fontSize: 14 },
  slim: {
    marginHorizontal: 20,
    marginBottom: 12,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: stamp.amberBg,
    borderWidth: 1,
    borderColor: '#F3D48A',
    paddingLeft: 12,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slimText: { flex: 1, fontFamily: outfit.semibold, fontSize: 13, lineHeight: 18, color: stamp.amberText },
  slimButton: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: stamp.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimButtonText: { fontFamily: outfit.bold, fontSize: 14, color: stamp.ink },
});
