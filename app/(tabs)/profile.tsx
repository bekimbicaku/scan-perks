import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { signOut, auth, getDb } from '@/lib/firebase';
import { router, useRootNavigationState } from 'expo-router';
import { LogOut, Tag, TriangleAlert as AlertTriangle, User, Gift, CreditCard } from 'lucide-react-native';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import RewardsWallet from '@/components/RewardsWallet';
import LoyaltyCards from '@/components/LoyaltyCards';
import ReferralHub from '@/components/ReferralHub';
import BrandLogo from '@/components/ui/BrandLogo';
import StatCard from '@/components/ui/StatCard';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import { colors, spacing, typography } from '@/theme';

interface Offer {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  description: string;
  validUntil: Date;
  membersOnly?: boolean;
}

export default function ProfileScreen() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalPoints: 0, totalRewards: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [referralBonusScans, setReferralBonusScans] = useState(0);
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    getDoc(doc(getDb(), 'users', auth.currentUser.uid)).then((userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.name || auth.currentUser?.email?.split('@')[0] || 'User');
        setReferralCode(data.referralCode || '');
        setReferralCount(data.referralCount || 0);
        setReferralBonusScans(data.referralBonusScans || 0);
      }
    });

    const rewardsRef = collection(getDb(), 'users', auth.currentUser.uid, 'rewards');
    const unsubscribeRewards = onSnapshot(rewardsRef, (snapshot) => {
      const active = snapshot.docs.filter((d) => !d.data().redeemed).length;
      setStats((prev) => ({ ...prev, totalRewards: active }));
    });

    const userStatsRef = collection(getDb(), 'users', auth.currentUser.uid, 'scans');
    const unsubscribeStats = onSnapshot(userStatsRef, (snapshot) => {
      const points = snapshot.docs.reduce((total, d) => total + (d.data().totalScans || 0), 0);
      setStats((prev) => ({ ...prev, totalPoints: points }));
    });

    loadOffers();
    return () => {
      unsubscribeStats();
      unsubscribeRewards();
    };
  }, [navigationState?.key]);

  const loadOffers = async () => {
    if (!auth.currentUser) return;
    try {
      const scansRef = collection(getDb(), 'users', auth.currentUser.uid, 'scans');
      const scansSnapshot = await getDocs(scansRef);
      const businessIds = scansSnapshot.docs.map((d) => d.id);

      if (businessIds.length === 0) {
        setLoading(false);
        return;
      }

      const offersPromises = businessIds.map(async (businessId) => {
        const offersQuery = query(
          collection(getDb(), 'businesses', businessId, 'offers'),
          where('validUntil', '>', new Date())
        );
        const offersSnapshot = await getDocs(offersQuery);
        const businessDoc = await getDoc(doc(getDb(), 'businesses', businessId));
        const businessData = businessDoc.data();

        return offersSnapshot.docs.map((d) => ({
          id: d.id,
          businessId,
          businessName: businessData?.name || 'Unknown Business',
          businessLogo:
            businessData?.logoUrl ||
            'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80',
          title: d.data().title,
          description: d.data().description,
          validUntil: d.data().validUntil.toDate(),
          membersOnly: d.data().membersOnly !== false,
        }));
      });

      const allOffers = await Promise.all(offersPromises);
      setOffers(allOffers.flat().sort((a, b) => a.validUntil.getTime() - b.validUntil.getTime()));
    } catch (err) {
      setError('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/(auth)/login');
  };

  if (!navigationState?.key) {
    return (
      <GlassBackground>
        <ScreenContainer>
          <Text style={styles.loadingText}>Loading...</Text>
        </ScreenContainer>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <ScreenContainer scroll>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <User size={28} color={colors.primaryDark} />
            </View>
            <BrandLogo size="sm" />
            <Text style={styles.title}>{userName}</Text>
            <Text style={styles.subtitle}>{auth.currentUser?.email}</Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard icon={<Tag size={20} color={colors.primaryDark} />} label="Total Points" value={stats.totalPoints} />
            <StatCard icon={<Gift size={20} color={colors.success} />} label="Active Rewards" value={stats.totalRewards} accent={colors.success} />
          </View>

          {referralCode ? (
            <View style={styles.section}>
              <ReferralHub
                referralCode={referralCode}
                referralCount={referralCount}
                referralBonusScans={referralBonusScans}
                userName={userName}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Loyalty Cards</Text>
              <CreditCard size={20} color={colors.primary} />
            </View>
            <LoyaltyCards />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rewards Wallet</Text>
            <RewardsWallet />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Offers</Text>
              <Tag size={20} color={colors.primary} />
            </View>

            {loading ? (
              <Text style={styles.loadingText}>Loading offers...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : offers.length === 0 ? (
              <GlassCard>
                <EmptyState
                  icon={<Gift size={36} color={colors.textMuted} />}
                  title="No current offers"
                  description="Scan more businesses to discover their offers!"
                />
              </GlassCard>
            ) : (
              offers.map((offer) => (
                <GlassCard key={`${offer.businessId}-${offer.id}`} style={styles.offerCard}>
                  <Text style={styles.businessName}>{offer.businessName}</Text>
                  {offer.membersOnly !== false ? (
                    <Text style={styles.membersOnly}>Members only</Text>
                  ) : null}
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerDescription} numberOfLines={2}>
                    {offer.description}
                  </Text>
                  <Text style={styles.validUntil}>
                    Valid until: {offer.validUntil.toLocaleDateString()}
                  </Text>
                </GlassCard>
              ))
            )}
          </View>

          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
              <AlertTriangle size={20} color={colors.error} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut size={20} color={colors.textMuted} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        <DeleteAccountModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
      </ScreenContainer>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingText: { ...typography.caption, textAlign: 'center', padding: spacing.lg },
  header: { alignItems: 'center', padding: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.glass.backgroundStrong,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '700', color: colors.primaryDark },
  statLabel: { ...typography.caption, marginTop: 4 },
  section: { padding: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 20, marginBottom: spacing.sm },
  referralLabel: { ...typography.caption, marginBottom: 4 },
  referralRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referralCode: { fontSize: 22, fontWeight: '700', color: colors.primaryDark, letterSpacing: 1 },
  copyBtn: { padding: spacing.sm },
  referralHint: { ...typography.caption, marginTop: spacing.sm },
  offerCard: { marginBottom: spacing.sm },
  businessName: { ...typography.label, marginBottom: 4 },
  membersOnly: { ...typography.label, fontSize: 11, color: colors.success, marginBottom: 4 },
  offerTitle: { ...typography.body, fontWeight: '600' },
  offerDescription: { ...typography.caption, marginTop: 4 },
  validUntil: { ...typography.caption, fontSize: 12, marginTop: spacing.sm, fontStyle: 'italic' },
  errorText: { color: colors.error, textAlign: 'center' },
  accountActions: { padding: spacing.md, gap: spacing.sm },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.errorLight,
  },
  deleteButtonText: { color: colors.error, fontWeight: '600' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.glass.backgroundStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutButtonText: { color: colors.textMuted, fontWeight: '600' },
});
