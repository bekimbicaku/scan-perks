import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Gift, Clock, CheckCircle, QrCode } from 'lucide-react-native';
import { auth, getDb } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import RewardQRModal from '@/components/RewardQRModal';
import { colors, spacing, typography } from '@/theme';

export interface Reward {
  id: string;
  businessId: string;
  businessName: string;
  rewardDescription: string;
  createdAt: Date;
  expiresAt: Date;
  redeemed: boolean;
}

export default function RewardsWallet() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const rewardsRef = collection(getDb(), 'users', auth.currentUser.uid, 'rewards');
    const q = query(rewardsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          businessId: data.businessId,
          businessName: data.businessName || 'Business',
          rewardDescription: data.rewardDescription || 'Special reward',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          expiresAt: data.expiresAt?.toDate?.() || new Date(),
          redeemed: data.redeemed || false,
        };
      });
      setRewards(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeRewards = rewards.filter((r) => !r.redeemed && r.expiresAt > new Date());
  const pastRewards = rewards.filter((r) => r.redeemed || r.expiresAt <= new Date());

  if (loading) {
    return (
      <GlassCard>
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </GlassCard>
    );
  }

  if (rewards.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={<Gift size={36} color={colors.primary} />}
          title="No rewards yet"
          description="Keep scanning at your favorite businesses to earn rewards!"
        />
      </GlassCard>
    );
  }

  const renderReward = (reward: Reward, active: boolean) => (
    <TouchableOpacity
      key={reward.id}
      style={[styles.rewardItem, !active && styles.rewardPast]}
      onPress={() => active && setSelectedReward(reward)}
      disabled={!active}
    >
      <View style={styles.rewardIcon}>
        {reward.redeemed ? (
          <CheckCircle size={22} color={colors.success} />
        ) : active ? (
          <Gift size={22} color={colors.primary} />
        ) : (
          <Clock size={22} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardBusiness}>{reward.businessName}</Text>
        <Text style={styles.rewardDesc}>{reward.rewardDescription}</Text>
        <Text style={styles.rewardMeta}>
          {reward.redeemed
            ? 'Redeemed'
            : reward.expiresAt <= new Date()
              ? 'Expired'
              : `Expires ${reward.expiresAt.toLocaleDateString()}`}
        </Text>
      </View>
      {active && !reward.redeemed && (
        <View style={styles.redeemBadge}>
          <QrCode size={16} color={colors.white} />
          <Text style={styles.redeemText}>Show</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView horizontal={false} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {activeRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Rewards ({activeRewards.length})</Text>
            <GlassCard noPadding>
              {activeRewards.map((r) => renderReward(r, true))}
            </GlassCard>
          </View>
        )}
        {pastRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            <GlassCard noPadding>
              {pastRewards.slice(0, 5).map((r) => renderReward(r, false))}
            </GlassCard>
          </View>
        )}
      </ScrollView>

      <RewardQRModal
        visible={!!selectedReward}
        onClose={() => setSelectedReward(null)}
        reward={selectedReward}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingText: { ...typography.caption, textAlign: 'center', padding: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rewardPast: { opacity: 0.65 },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: { flex: 1 },
  rewardBusiness: { ...typography.label, marginBottom: 2 },
  rewardDesc: { ...typography.body, fontSize: 15, fontWeight: '600' },
  rewardMeta: { ...typography.caption, marginTop: 4 },
  redeemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  redeemText: { color: colors.white, fontSize: 12, fontWeight: '600' },
});
