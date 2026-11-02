import { View, Text, StyleSheet } from 'react-native';
import { Gift, QrCode } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import { colors, spacing, typography } from '@/theme';

interface LiveVenueCardProps {
  name: string;
  reward: string;
  scansRequired: number;
  onOpen: () => void;
  onScan: () => void;
}

export default function LiveVenueCard({
  name,
  reward,
  scansRequired,
  onOpen,
  onScan,
}: LiveVenueCardProps) {
  return (
    <GlassCard>
      <Text style={styles.kicker}>Now live</Text>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.rewardRow}>
        <Gift size={18} color={colors.primaryDark} />
        <Text style={styles.reward}>
          {scansRequired} stamps · {reward}
        </Text>
      </View>
      <Text style={styles.instruction}>Open the Scan tab. Your camera app will not open this QR.</Text>
      <View style={styles.actions}>
        <GlassButton
          label="Open Scan tab"
          onPress={onScan}
          icon={<QrCode size={18} color={colors.white} />}
        />
        <GlassButton label="View venue" variant="secondary" onPress={onOpen} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  kicker: { ...typography.label, color: colors.success, marginBottom: spacing.xs },
  name: { ...typography.h2, fontSize: 22, marginBottom: spacing.sm },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  reward: { ...typography.body, fontWeight: '700', flex: 1 },
  instruction: { ...typography.body, lineHeight: 22, marginBottom: spacing.md },
  actions: { gap: spacing.sm },
});
