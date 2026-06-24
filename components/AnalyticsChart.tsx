import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { colors, spacing, typography, radius } from '@/theme';

interface AnalyticsChartProps {
  businessId: string;
}

export default function AnalyticsChart({ businessId }: AnalyticsChartProps) {
  const [dailyData, setDailyData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (!businessId) return;

    const analyticsRef = doc(db, 'businesses', businessId, 'analytics', 'daily');
    const unsubscribe = onSnapshot(analyticsRef, (snap) => {
      if (!snap.exists()) {
        setDailyData([]);
        return;
      }

      const data = snap.data();
      const days: { label: string; value: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
        days.push({
          label: dayLabel,
          value: data[`${key}.scans`] || 0,
        });
      }

      setDailyData(days);
    });

    return () => unsubscribe();
  }, [businessId]);

  const maxValue = Math.max(...dailyData.map((d) => d.value), 1);

  if (dailyData.every((d) => d.value === 0)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Scan activity will appear here as customers visit.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last 7 Days</Text>
      <View style={styles.chart}>
        {dailyData.map((day) => (
          <View key={day.label} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max(8, (day.value / maxValue) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{day.value}</Text>
            <Text style={styles.barLabel}>{day.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  title: { ...typography.label, marginBottom: spacing.sm },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: spacing.sm,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: 28,
    height: 80,
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barValue: { ...typography.caption, fontSize: 11, fontWeight: '600', marginTop: 4 },
  barLabel: { ...typography.caption, fontSize: 10 },
  empty: { padding: spacing.md },
  emptyText: { ...typography.caption, textAlign: 'center' },
});
