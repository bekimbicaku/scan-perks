import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, getDb } from '@/lib/firebase';
import { getPassportProgress } from '@/lib/features';
import { GlassCard } from '@/components/ui/GlassBackground';
import SectionHeader from '@/components/ui/SectionHeader';
import { Map } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

export default function LocalPassportCard() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(getDb(), 'users', auth.currentUser.uid), (snap) => {
      setCategories(snap.data()?.passportCategories || []);
    });
    return () => unsub();
  }, []);

  const progress = getPassportProgress(categories);
  const visited = progress.filter((p) => p.visited).length;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Local Passport"
        subtitle={`${visited}/${progress.length} categories — unlock city-wide perks`}
        icon={<Map size={20} color={colors.accent} />}
      />
      <GlassCard>
        <View style={styles.grid}>
          {progress.map((item) => (
            <View key={item.category} style={[styles.stamp, item.visited && styles.stampActive]}>
              <Text style={styles.stampIcon}>{item.icon}</Text>
              <Text style={[styles.stampLabel, item.visited && styles.stampLabelActive]}>
                {item.category}
              </Text>
              {item.visited ? <Text style={styles.check}>✓</Text> : null}
            </View>
          ))}
        </View>
        <Text style={styles.hint}>
          Visit different business types to unlock exclusive Scan Perks badges.
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stamp: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    opacity: 0.55,
  },
  stampActive: {
    opacity: 1,
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.glass.tint,
  },
  stampIcon: { fontSize: 28 },
  stampLabel: { ...typography.caption, fontSize: 11, marginTop: 4 },
  stampLabelActive: { color: colors.primaryDark, fontWeight: '700' },
  check: { color: colors.success, fontWeight: '800', marginTop: 2 },
  hint: { ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
