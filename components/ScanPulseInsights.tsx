import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { Activity } from 'lucide-react-native';
import { getDb } from '@/lib/firebase';
import { PULSE_EMOJI, PulseMood } from '@/lib/features';
import { GlassCard } from '@/components/ui/GlassBackground';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, typography } from '@/theme';

interface ScanPulseInsightsProps {
  businessId: string;
}

export default function ScanPulseInsights({ businessId }: ScanPulseInsightsProps) {
  const [pulse, setPulse] = useState({ love: 0, good: 0, meh: 0, total: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(getDb(), 'businesses', businessId, 'pulse', 'summary'), (snap) => {
      const d = snap.data();
      setPulse({
        love: d?.love || 0,
        good: d?.good || 0,
        meh: d?.meh || 0,
        total: d?.total || 0,
      });
    });
    return () => unsub();
  }, [businessId]);

  if (pulse.total === 0) {
    return (
      <View style={styles.wrap}>
        <SectionHeader title="Scan Pulse™" subtitle="Live customer mood after each scan" icon={<Activity size={20} color={colors.accent} />} />
        <GlassCard>
          <Text style={styles.empty}>Pulse data appears when customers rate their visit.</Text>
        </GlassCard>
      </View>
    );
  }

  const moods: PulseMood[] = ['love', 'good', 'meh'];

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Scan Pulse™"
        subtitle={`${pulse.total} visit ratings`}
        icon={<Activity size={20} color={colors.accent} />}
      />
      <GlassCard>
        {moods.map((mood) => {
          const count = pulse[mood];
          const pct = pulse.total ? Math.round((count / pulse.total) * 100) : 0;
          return (
            <View key={mood} style={styles.barRow}>
              <Text style={styles.emoji}>{PULSE_EMOJI[mood]}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: mood === 'love' ? colors.success : mood === 'good' ? colors.primary : colors.warning }]} />
              </View>
              <Text style={styles.pct}>{pct}%</Text>
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  empty: { ...typography.caption, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  emoji: { fontSize: 22, width: 32 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.glass.tint, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  pct: { ...typography.caption, width: 36, textAlign: 'right', fontWeight: '700' },
});
