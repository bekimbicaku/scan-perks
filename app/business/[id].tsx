import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Star,
  Gift,
  Navigation,
  QrCode,
  ExternalLink,
  Percent,
} from 'lucide-react-native';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, getDb } from '@/lib/firebase';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import DigitalLoyaltyCard from '@/components/DigitalLoyaltyCard';
import { FavoriteButton } from '@/components/FavoriteBusinesses';
import { getLoyaltySettings } from '@/lib/loyalty';
import { getMapsUrl, formatDistance, haversineDistanceKm } from '@/lib/geo';
import {
  formatMemberPerkLabel,
  hasMemberPerk,
} from '@/lib/memberPerks';
import { colors, spacing, typography, radius } from '@/theme';
import * as Location from 'expo-location';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<any>(null);
  const [loyalty, setLoyalty] = useState({
    scansRequired: 10,
    reward: '',
    memberPerkTitle: '',
    memberPerkDescription: '',
    memberDiscountPercent: 0,
  });
  const [offers, setOffers] = useState<any[]>([]);
  const [userScans, setUserScans] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadBusiness();
  }, [id]);

  const loadBusiness = async () => {
    if (!id) return;
    try {
      const businessDoc = await getDoc(doc(getDb(), 'businesses', id));
      if (!businessDoc.exists()) {
        router.back();
        return;
      }

      const data = { id: businessDoc.id, ...businessDoc.data() } as any;
      setBusiness(data);

      const loyaltySettings = await getLoyaltySettings(id);
      setLoyalty(loyaltySettings);

      let scanned = false;
      let scans = 0;
      if (auth.currentUser) {
        const scanDoc = await getDoc(doc(getDb(), 'users', auth.currentUser.uid, 'scans', id));
        if (scanDoc.exists()) {
          scanned = true;
          scans = scanDoc.data().totalScans || 0;
        }
      }
      setHasScanned(scanned);
      setUserScans(scans);

      const offersSnap = await getDocs(
        query(
          collection(getDb(), 'businesses', id, 'offers'),
          where('validUntil', '>', new Date())
        )
      );
      const allOffers = offersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        membersOnly: d.data().membersOnly !== false,
        validUntil: d.data().validUntil?.toDate?.(),
      }));
      setOffers(
        allOffers.filter((offer) => !offer.membersOnly || scanned)
      );

      if (data.location?.latitude && data.location?.longitude) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            setDistance(
              haversineDistanceKm(
                loc.coords.latitude,
                loc.coords.longitude,
                data.location.latitude,
                data.location.longitude
              )
            );
          }
        } catch {
          // Location optional on web / denied permissions
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (business?.location) {
      Linking.openURL(
        getMapsUrl(business.location.latitude, business.location.longitude, business.name)
      );
    }
  };

  const openExternal = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Failed to open URL', error);
    }
  };

  if (loading || !business) {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.loading}>Loading...</Text>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  const progress = userScans % loyalty.scansRequired;
  const progressPct =
    userScans > 0 && userScans % loyalty.scansRequired === 0
      ? 100
      : (progress / loyalty.scansRequired) * 100;
  const memberPerk = {
    memberPerkTitle: loyalty.memberPerkTitle,
    memberPerkDescription: loyalty.memberPerkDescription,
    memberDiscountPercent: loyalty.memberDiscountPercent,
  };
  const showReviews =
    hasScanned && (business.googleReviewUrl || business.tripAdvisorUrl);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.navy} />
          </TouchableOpacity>

          <Image
            source={{
              uri:
                business.imageUrl ||
                business.logoUrl ||
                'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80',
            }}
            style={styles.hero}
          />

          <View style={styles.content}>
            <GlassCard>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{business.name}</Text>
                <FavoriteButton businessId={business.id} />
                {business.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Star size={12} color={colors.white} fill={colors.white} />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
              </View>
              <Text style={styles.type}>{business.type}</Text>

              {business.address && (
                <View style={styles.row}>
                  <MapPin size={16} color={colors.primary} />
                  <Text style={styles.address}>
                    {business.address.street}, {business.address.city}
                    {distance !== null && ` · ${formatDistance(distance)}`}
                  </Text>
                </View>
              )}

              {business.rating && (
                <View style={styles.row}>
                  <Star size={16} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.rating}>{business.rating.toFixed(1)}</Text>
                </View>
              )}
            </GlassCard>

            {auth.currentUser && hasScanned && (
              <View style={styles.mt}>
                <DigitalLoyaltyCard
                  businessId={business.id}
                  businessName={business.name}
                  businessType={business.type}
                  totalScans={userScans}
                  scansRequired={loyalty.scansRequired}
                  reward={loyalty.reward}
                  memberPerk={memberPerk}
                />
              </View>
            )}

            {auth.currentUser && !hasScanned && (
              <GlassCard style={styles.mt}>
                <Text style={styles.sectionTitle}>Your Progress</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  Scan the QR code to start your loyalty card
                </Text>
                <View style={styles.rewardRow}>
                  <Gift size={18} color={colors.primary} />
                  <Text style={styles.rewardLabel}>Reward: {loyalty.reward}</Text>
                </View>
              </GlassCard>
            )}

            {hasScanned && hasMemberPerk(memberPerk) && (
              <GlassCard style={styles.mt}>
                <View style={styles.row}>
                  <Percent size={18} color={colors.success} />
                  <Text style={styles.sectionTitle}>Member Perk</Text>
                </View>
                <Text style={styles.memberTitle}>{formatMemberPerkLabel(memberPerk)}</Text>
                {memberPerk.memberPerkDescription ? (
                  <Text style={styles.memberDesc}>{memberPerk.memberPerkDescription}</Text>
                ) : null}
              </GlassCard>
            )}

            {showReviews && (
              <GlassCard style={styles.mt}>
                <Text style={styles.sectionTitle}>Leave a Review</Text>
                <Text style={styles.reviewHint}>
                  Thanks for visiting — help others find {business.name}.
                </Text>
                <View style={styles.actions}>
                  {business.googleReviewUrl ? (
                    <GlassButton
                      label="Google review"
                      variant="secondary"
                      onPress={() => openExternal(business.googleReviewUrl)}
                      icon={<ExternalLink size={18} color={colors.primaryDark} />}
                    />
                  ) : null}
                  {business.tripAdvisorUrl ? (
                    <GlassButton
                      label="TripAdvisor review"
                      variant="secondary"
                      onPress={() => openExternal(business.tripAdvisorUrl)}
                      icon={<Star size={18} color={colors.primaryDark} />}
                    />
                  ) : null}
                </View>
              </GlassCard>
            )}

            {offers.length > 0 && (
              <View style={styles.mt}>
                <Text style={styles.sectionTitle}>
                  {hasScanned ? 'Member Offers' : 'Active Offers'}
                </Text>
                {offers.map((offer) => (
                  <GlassCard key={offer.id} style={styles.offerCard}>
                    {offer.membersOnly ? (
                      <Text style={styles.membersOnly}>Members only</Text>
                    ) : null}
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <Text style={styles.offerDesc}>{offer.description}</Text>
                  </GlassCard>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <GlassButton
                label="Scan QR Code"
                onPress={() => router.push('/scan')}
                icon={<QrCode size={20} color={colors.white} />}
              />
              {business.location && (
                <GlassButton
                  label="Get Directions"
                  variant="secondary"
                  onPress={openMaps}
                  icon={<Navigation size={20} color={colors.primaryDark} />}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { ...typography.body, textAlign: 'center', marginTop: 40 },
  backBtn: { padding: spacing.md, alignSelf: 'flex-start' },
  hero: {
    height: 200,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
  },
  content: { padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h2, flex: 1 },
  type: { ...typography.caption, marginTop: 4, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  address: { ...typography.caption, flex: 1 },
  rating: { ...typography.body, fontWeight: '600', color: colors.warning },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  mt: { marginTop: spacing.md },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  progressBar: {
    height: 10,
    backgroundColor: colors.offWhite,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  progressText: { ...typography.caption, fontWeight: '600' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  rewardLabel: { ...typography.body, fontSize: 14 },
  memberTitle: { ...typography.body, fontWeight: '700', color: colors.success },
  memberDesc: { ...typography.caption, marginTop: 4 },
  reviewHint: { ...typography.caption, marginBottom: spacing.sm },
  offerCard: { marginBottom: spacing.sm },
  membersOnly: {
    ...typography.label,
    fontSize: 11,
    color: colors.success,
    marginBottom: 4,
  },
  offerTitle: { ...typography.body, fontWeight: '600' },
  offerDesc: { ...typography.caption, marginTop: 4 },
  actions: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xxl },
});
