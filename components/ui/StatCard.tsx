import { View, Text, StyleSheet } from 'react-native';
import { stamp, outfit } from '@/theme';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
  iconBg?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  iconBg = stamp.skyTint,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: stamp.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 14,
    minHeight: 72,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  value: {
    fontFamily: outfit.extra,
    fontSize: 26,
    lineHeight: 28,
    color: stamp.deep,
  },
  label: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
    marginTop: 3,
  },
});
