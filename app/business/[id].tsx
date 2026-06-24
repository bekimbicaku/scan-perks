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
import { FavoriteButton } from '@/components/FavoriteBusinesses';
import { getLoyaltySettings } from '@/lib/loyalty';
import { getMapsUrl, formatDistance, haversineDistanceKm } from '@/lib/geo';
import { colors, spacing, typography, radius } from '@/theme';
import * as Location from 'expo-location';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<any>(null);
  const [loyalty, setLoyalty] = useState({ scansRequired: 10, reward: '' });
  const [offers, setOffers] = useState<any[]>([]);
  const [userScans, setUserScans] = useState(0);
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

      const data = { id: businessDoc.id, ...businessDoc.data() };
      setBusiness(data);

      const loyaltySettings = await getLoyaltySettings(id);
      setLoyalty(loyaltySettings);

      const offersSnap = await getDocs(
        query(
          collection(getDb(), 'businesses', id, 'offers'),
          where('validUntil', '>', new Date())
        )
      );
      setOffers(
        offersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          validUntil: d.data().validUntil?.toDate?.(),
        }))
      );

      if (auth.currentUser) {
        const scanDoc = await getDoc(doc(getDb(), 'users', auth.currentUser.uid, 'scans', id));
        if (scanDoc.exists()) {
          setUserScans(scanDoc.data().totalScans || 0);
        }
      }

      if (data.location?.latitude && data.location?.longitude) {
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
  const progressPct = userScans > 0 && userScans % loyalty.scansRequired === 0
    ? 100
    : (progress / loyalty.scansRequired) * 100;

  return (
    <GlassBackground>
      <SafeAreaView style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.navy} />
          </TouchableOpacity>

          <Image
            source={{
              uri: business.imageUrl || business.logoUrl ||
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

            {auth.currentUser && (
              <GlassCard style={styles.mt}>
                <Text style={styles.sectionTitle}>Your Progress</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {userScans > 0 && userScans % loyalty.scansRequired === 0
                    ? 'Reward ready!'
                    : `${userScans % loyalty.scansRequired || (userScans > 0 ? loyalty.scansRequired : 0)}/${loyalty.scansRequired} scans`}
                </Text>
                <View style={styles.rewardRow}>
                  <Gift size={18} color={colors.primary} />
                  <Text style={styles.rewardLabel}>Reward: {loyalty.reward}</Text>
                </View>
              </GlassCard>
            )}

            {offers.length > 0 && (
              <View style={styles.mt}>
                <Text style={styles.sectionTitle}>Active Offers</Text>
                {offers.map((offer) => (
                  <GlassCard key={offer.id} style={styles.offerCard}>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <Text style={styles.offerDesc}>{offer.description}</Text>
                  </GlassCard>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <GlassButton
                label="Scan QR Code"
                onPress={() => router.push('/(tabs)/scan')}
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
  offerCard: { marginBottom: spacing.sm },
  offerTitle: { ...typography.body, fontWeight: '600' },
  offerDesc: { ...typography.caption, marginTop: 4 },
  actions: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xxl },
});
