import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { Flame, Trophy, Target } from 'lucide-react-native';
import { auth, db } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import { colors, spacing, typography } from '@/theme';

export default function CustomerEngagementCard() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [bonusScans, setBonusScans] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      const data = snap.data();
      setStreak(data?.scanStreak || 0);
      setLongestStreak(data?.longestStreak || 0);
      setBonusScans(data?.referralBonusScans || 0);
      setBonusPoints(data?.bonusPoints || 0);
    });

    return () => unsub();
  }, []);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Your Progress</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <View style={[styles.icon, { backgroundColor: '#FEF3C7' }]}>
            <Flame size={20} color={colors.warning} />
          </View>
          <Text style={styles.value}>{streak}</Text>
          <Text style={styles.label}>Day streak</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.icon, { backgroundColor: colors.successLight }]}>
            <Trophy size={20} color={colors.success} />
          </View>
          <Text style={styles.value}>{longestStreak}</Text>
          <Text style={styles.label}>Best streak</Text>
        </View>
        <View style={styles.item}>
          <View style={[styles.icon, { backgroundColor: colors.glass.tint }]}>
            <Target size={20} color={colors.primaryDark} />
          </View>
          <Text style={styles.value}>{bonusScans + bonusPoints}</Text>
          <Text style={styles.label}>Bonus perks</Text>
        </View>
      </View>
      {streak >= 3 ? (
        <Text style={styles.hint}>🔥 Keep scanning daily to maintain your streak!</Text>
      ) : (
        <Text style={styles.hint}>Scan today to start or extend your streak.</Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  title: { ...typography.h3, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  item: { flex: 1, alignItems: 'center' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: { fontSize: 22, fontWeight: '800', color: colors.navy },
  label: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  hint: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
