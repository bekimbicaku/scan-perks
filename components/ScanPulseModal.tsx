import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import { PULSE_EMOJI, PulseMood } from '@/lib/features';
import { colors, spacing, typography } from '@/theme';

interface ScanPulseModalProps {
  visible: boolean;
  businessName: string;
  onSubmit: (mood: PulseMood) => void;
  onSkip: () => void;
}

const MOODS: PulseMood[] = ['love', 'good', 'meh'];

export default function ScanPulseModal({ visible, businessName, onSubmit, onSkip }: ScanPulseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <GlassCard style={styles.card}>
          <Text style={styles.badge}>Scan Pulse™</Text>
          <Text style={styles.title}>How was {businessName}?</Text>
          <Text style={styles.subtitle}>One tap — helps the business improve in real time</Text>

          <View style={styles.row}>
            {MOODS.map((mood) => (
              <TouchableOpacity key={mood} style={styles.moodBtn} onPress={() => onSubmit(mood)}>
                <Text style={styles.emoji}>{PULSE_EMOJI[mood]}</Text>
                <Text style={styles.moodLabel}>
                  {mood === 'love' ? 'Loved it' : mood === 'good' ? 'Good' : 'Meh'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={onSkip}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 74, 110, 0.45)',
    justifyContent: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: { alignItems: 'center' },
  badge: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  moodBtn: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.glass.tint,
    minWidth: 88,
  },
  emoji: { fontSize: 36 },
  moodLabel: { ...typography.caption, marginTop: 6, fontWeight: '600' },
  skip: { color: colors.textMuted, fontWeight: '600' },
});
