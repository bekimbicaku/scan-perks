import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Cake } from 'lucide-react-native';
import { auth, getDb } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import { colors, spacing, typography } from '@/theme';

export default function BirthdayTreatCard() {
  const [treat, setTreat] = useState<{ businessName: string; reward: string } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(collection(getDb(), 'users', auth.currentUser.uid, 'rewards'), (snap) => {
      const birthday = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((item: any) => item.type === 'birthday' && !item.redeemed);
      if (birthday) {
        setTreat({
          businessName: birthday.businessName || 'a local spot',
          reward: birthday.rewardDescription || 'A birthday treat',
        });
      } else {
        setTreat(null);
      }
    });
    return () => unsub();
  }, []);

  if (!treat) return null;

  return (
    <GlassCard style={styles.card}>
      <Cake size={22} color={colors.warning} />
      <Text style={styles.title}>Happy birthday week</Text>
      <Text style={styles.desc}>
        Show this at {treat.businessName} for {treat.reward}. Staff can redeem it from the Rewards
        wallet QR.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, alignItems: 'flex-start' },
  title: { ...typography.h3 },
  desc: { ...typography.caption, lineHeight: 20 },
});
