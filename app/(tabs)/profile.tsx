import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { signOut, auth, getDb } from '@/lib/firebase';
import { router, useRootNavigationState } from 'expo-router';
import { LogOut, Tag, TriangleAlert as AlertTriangle, Gift, CreditCard, Cake } from 'lucide-react-native';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import RewardsWallet from '@/components/RewardsWallet';
import LoyaltyCards from '@/components/LoyaltyCards';
import ReferralHub from '@/components/ReferralHub';
import NotificationPermissionCard from '@/components/NotificationPermissionCard';
import BrandLogo from '@/components/ui/BrandLogo';
import StatCard from '@/components/ui/StatCard';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import { colors, spacing, typography, stamp, outfit, personMark } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import { formatBirthday, parseBirthdayInput } from '@/lib/birthday';

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
  const [hasCard, setHasCard] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [birthdaySaved, setBirthdaySaved] = useState(false);
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    if (!auth.currentUser) {
      router.replace('/login');
      return;
    }

    getDoc(doc(getDb(), 'users', auth.currentUser.uid)).then((userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.name || auth.currentUser?.email?.split('@')[0] || 'User');
        setReferralCode(data.referralCode || '');
        setReferralCount(data.referralCount || 0);
        setReferralBonusScans(data.referralBonusScans || 0);
        setBirthday(formatBirthday(data.birthdayMonth, data.birthdayDay));
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
      setHasCard(snapshot.docs.length > 0);
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

  const handleSaveBirthday = async () => {
    if (!auth.currentUser) return;
    const parsed = birthday.trim() ? parseBirthdayInput(birthday) : null;
    if (birthday.trim() && !parsed) {
      setError('Birthday should look like 05-14');
      return;
    }
    await updateDoc(doc(getDb(), 'users', auth.currentUser.uid), {
      birthdayMonth: parsed?.month || null,
      birthdayDay: parsed?.day || null,
    });
    setBirthdaySaved(true);
    setTimeout(() => setBirthdaySaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  if (!navigationState?.key) {
    return (
      <GlassBackground variant="customer">
        <ScreenContainer>
          <Text style={styles.loadingText}>Loading...</Text>
        </ScreenContainer>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground variant="customer">
      <ScreenContainer scroll contentStyle={styles.tabSpace}>
          <View style={styles.header}>
            <BrandLogo size="sm" />
            <LinearGradient
              colors={[stamp.sky, stamp.deep]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{personMark(userName)}</Text>
            </LinearGradient>
            <Text style={styles.title}>{userName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{auth.currentUser?.email}</Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard icon={<Tag size={20} color={stamp.deep} />} label="Total Points" value={stats.totalPoints} iconBg={stamp.skyTint} />
            <StatCard icon={<Gift size={20} color={stamp.mintText} />} label="Active Rewards" value={stats.totalRewards} iconBg={stamp.mintBg} />
          </View>

          <View style={styles.section}>
            <NotificationPermissionCard compact />
          </View>

          {referralCode && hasCard ? (
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
              <CreditCard size={20} color={stamp.deep} />
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
              <Tag size={20} color={stamp.amberText} />
            </View>

            {loading ? (
              <Text style={styles.loadingText}>Loading offers...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : offers.length === 0 ? (
              <GlassCard stamp>
                <EmptyState
                  align="left"
                  iconBg={stamp.amberBg}
                  icon={<Tag size={22} color={stamp.amberText} />}
                  title="No current offers"
                  description="Scan more businesses to discover their offers!"
                />
              </GlassCard>
            ) : (
              offers.map((offer) => (
                <GlassCard stamp key={`${offer.businessId}-${offer.id}`} style={styles.offerCard}>
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

          <View style={styles.section}>
            <GlassCard stamp style={styles.birthdayCard}>
              <View style={styles.birthdayIcon}>
                <Cake size={20} color={stamp.amberText} />
              </View>
              <Text style={styles.sectionTitle}>Birthday treat</Text>
              <Text style={styles.birthdayHint}>
                Add MM-DD so participating venues can send you a birthday reward.
              </Text>
              <Text style={styles.fieldLabel}>Birthday</Text>
              <GlassInput
                stamp
                placeholder="MM-DD"
                value={birthday}
                onChangeText={setBirthday}
                keyboardType="numbers-and-punctuation"
              />
              <GlassButton
                appearance="stamp"
                variant="secondary"
                label={birthdaySaved ? 'Saved' : 'Save birthday'}
                onPress={handleSaveBirthday}
              />
            </GlassCard>
          </View>

          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityRole="button">
              <LogOut size={20} color={stamp.deep} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)} accessibilityRole="button">
              <AlertTriangle size={20} color={stamp.danger} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
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
  tabSpace: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: spacing.md },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: spacing.sm,
  },
  avatarText: { fontFamily: outfit.extra, fontSize: 32, color: stamp.white },
  title: { fontFamily: outfit.extra, fontSize: 28, letterSpacing: -0.6, color: stamp.deep, textAlign: 'center' },
  subtitle: { fontFamily: outfit.regular, fontSize: 15, color: stamp.muted, marginTop: 4, textAlign: 'center', maxWidth: '100%' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, width: '100%' },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '700', color: colors.primaryDark },
  statLabel: { ...typography.caption, marginTop: 4 },
  section: { padding: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: outfit.extra, fontSize: 22, letterSpacing: -0.4, color: stamp.deep, marginBottom: spacing.sm },
  fieldLabel: { fontFamily: outfit.semibold, fontSize: 14, color: stamp.deep },
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
    minHeight: 54,
    padding: spacing.md,
    borderRadius: stamp.radiusButton,
    backgroundColor: stamp.white,
    borderWidth: 1.5,
    borderColor: stamp.danger,
  },
  deleteButtonText: { color: stamp.danger, fontFamily: outfit.bold, fontSize: 16 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    padding: spacing.md,
    borderRadius: stamp.radiusButton,
    backgroundColor: stamp.white,
    borderWidth: 1.5,
    borderColor: stamp.input,
  },
  signOutButtonText: { color: stamp.deep, fontFamily: outfit.bold, fontSize: 16 },
  birthdayCard: { gap: spacing.sm },
  birthdayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: stamp.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdayHint: { fontFamily: outfit.regular, fontSize: 14, lineHeight: 20, color: stamp.muted },
});
