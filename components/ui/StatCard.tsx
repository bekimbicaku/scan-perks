import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import { colors, spacing, typography } from '@/theme';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}

export default function StatCard({ icon, label, value, accent = colors.primaryDark }: StatCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}15` }]}>{icon}</View>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: { fontSize: 24, fontWeight: '800' },
  label: { ...typography.caption, marginTop: 4, textAlign: 'center' },
});
