import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  MapPin,
  Star,
  ChevronRight,
  Building2,
  QrCode,
  Trophy,
  Gift,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { router, useRootNavigationState } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import EmptyState from '@/components/ui/EmptyState';
import ScanHistory from '@/components/ScanHistory';
import CustomerEngagementCard from '@/components/CustomerEngagementCard';
import FavoriteBusinesses from '@/components/FavoriteBusinesses';
import LocalPassportCard from '@/components/LocalPassportCard';
import BrandLogo from '@/components/ui/BrandLogo';
import SectionHeader from '@/components/ui/SectionHeader';
import StatCard from '@/components/ui/StatCard';
import { getLoyaltySettings, DEFAULT_SCANS_REQUIRED } from '@/lib/loyalty';
import { haversineDistanceKm, formatDistance } from '@/lib/geo';
import { colors, spacing, typography, radius } from '@/theme';

interface Business {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
  totalScans: number;
  lastScan: Date;
  scansRequired: number;
}

interface NearbyBusiness {
  id: string;
  name: string;
  type: string;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
  rating?: number;
  isPremium: boolean;
  distance?: number;
  location?: { latitude: number; longitude: number };
  address?: { street: string; city: string };
}

export default function HomeScreen() {
  const [scannedBusinesses, setScannedBusinesses] = useState<Business[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [isReady] = useFrameworkReady();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isReady || !navigationState?.key) return;

    const checkAuth = async () => {
      if (!auth.currentUser) {
        router.replace('/(auth)/login');
        return;
      }
      loadUserData();
    };
    checkAuth();
  }, [isReady, navigationState?.key]);

  const loadUserData = useCallback(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(db, 'users', auth.currentUser.uid, 'scans');
    const scansQuery = query(scansRef, orderBy('lastScan', 'desc'));

    const unsubscribe = onSnapshot(
      scansQuery,
      {
        next: async (snapshot) => {
          try {
            let points = 0;
            const promises = snapshot.docs.map(async (scanDoc) => {
              const businessRef = doc(db, 'businesses', scanDoc.id);
              const businessDoc = await getDoc(businessRef);
              const loyalty = await getLoyaltySettings(scanDoc.id);

              if (businessDoc.exists()) {
                const totalScans = scanDoc.data().totalScans || 0;
                points += totalScans;
                return {
                  id: scanDoc.id,
                  name: businessDoc.data().name,
                  type: businessDoc.data().type,
                  logoUrl:
                    businessDoc.data().logoUrl ||
                    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80',
                  totalScans,
                  lastScan: scanDoc.data().lastScan?.toDate() || new Date(),
                  scansRequired: loyalty.scansRequired,
                };
              }
              return null;
            });

            const results = await Promise.all(promises);
            setTotalPoints(points);
            setScannedBusinesses(results.filter((b): b is Business => b !== null));
            setLoading(false);
          } catch (err) {
            console.error('Error fetching businesses:', err);
            setError('Failed to load scanned businesses');
            setLoading(false);
          }
        },
        error: () => {
          setError('Failed to load scanned businesses');
          setLoading(false);
        },
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isReady && auth.currentUser) {
      initLocation();
    }
  }, [isReady]);

  useEffect(() => {
    if (userLocation) loadNearbyBusinesses();
  }, [userLocation]);

  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } else {
      loadNearbyBusinesses();
    }
  };

  const loadNearbyBusinesses = async () => {
    try {
      const businessesQuery = query(
        collection(db, 'businesses'),
        where('isActive', '==', true),
        orderBy('__name__'),
        limit(15)
      );

      const snapshot = await getDocs(businessesQuery);
      let loaded = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as NearbyBusiness[];

      if (userLocation) {
        loaded = loaded
          .map((b) => ({
            ...b,
            distance: b.location
              ? haversineDistanceKm(
                  userLocation.coords.latitude,
                  userLocation.coords.longitude,
                  b.location.latitude,
                  b.location.longitude
                )
              : undefined,
          }))
          .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      }

      setNearbyBusinesses(loaded.slice(0, 10));
    } catch (err) {
      console.error('Error loading nearby businesses:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNearbyBusinesses();
    setRefreshing(false);
  }, [userLocation]);

  const renderProgressCircles = (totalScans: number, scansRequired: number) => {
    const required = scansRequired || DEFAULT_SCANS_REQUIRED;
    const completedInCycle =
      totalScans > 0 && totalScans % required === 0
        ? required
        : totalScans % required;
    const circles = [];

    for (let i = 0; i < required; i++) {
      if (i === required - 1 && completedInCycle === required && totalScans >= required) {
        circles.push(<Gift key={i} size={22} color={colors.success} style={styles.progressIcon} />);
      } else if (i < completedInCycle) {
        circles.push(
          <Star key={i} size={22} color={colors.primary} fill={colors.primary} style={styles.progressIcon} />
        );
      } else {
        circles.push(
          <Star key={i} size={22} color={colors.lightBlue} style={styles.progressIcon} />
        );
      }
    }
    return circles;
  };

  if (!isReady || !navigationState?.key) {
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
      <ScreenContainer
        scroll
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />,
        }}
      >
          <View style={styles.welcomeSection}>
            <BrandLogo size="lg" />
            <Text style={styles.welcomeSubtitle}>Earn rewards at local businesses worldwide</Text>
            <View style={styles.statsRow}>
              <StatCard icon={<Trophy size={22} color={colors.primaryDark} />} label="Total Points" value={totalPoints} />
              <StatCard icon={<Gift size={22} color={colors.success} />} label="Businesses" value={scannedBusinesses.length} accent={colors.success} />
            </View>
          </View>

          <View style={styles.section}>
            <CustomerEngagementCard />
          </View>

          <FavoriteBusinesses />

          <LocalPassportCard />

          <View style={styles.section}>
            <SectionHeader title="My Scanned Businesses" icon={<Building2 size={20} color={colors.primary} />} />

            {loading ? (
              <Text style={styles.loadingText}>Loading your rewards...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : scannedBusinesses.length === 0 ? (
              <GlassCard>
                <EmptyState
                  icon={<QrCode size={36} color={colors.primary} />}
                  title="Make Your First Scan!"
                  description="Visit any participating business and scan their QR code to start earning rewards."
                  action={
                    <GlassButton label="Scan Now" onPress={() => router.push('/(tabs)/scan')} />
                  }
                />
              </GlassCard>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessList}>
                {scannedBusinesses.map((business) => {
                  const earned =
                    business.totalScans > 0 &&
                    business.totalScans % business.scansRequired === 0;
                  return (
                    <TouchableOpacity
                      key={business.id}
                      onPress={() => router.push(`/business/${business.id}`)}
                    >
                      <GlassCard style={styles.businessCard}>
                        <View style={styles.businessHeader}>
                          <Image source={{ uri: business.logoUrl }} style={styles.businessLogo} />
                          <View style={styles.businessInfo}>
                            <Text style={styles.businessName}>{business.name}</Text>
                            <Text style={styles.lastScanned}>
                              Last visited: {business.lastScan.toLocaleDateString()}
                            </Text>
                          </View>
                          <ChevronRight size={18} color={colors.textMuted} />
                        </View>
                        <View style={styles.progressContainer}>
                          <View style={styles.progressCircles}>
                            {renderProgressCircles(business.totalScans, business.scansRequired)}
                          </View>
                          <Text style={styles.progressText}>
                            {(() => {
                              const cycle = business.totalScans % business.scansRequired;
                              const current =
                                business.totalScans === 0
                                  ? 0
                                  : cycle === 0
                                    ? business.scansRequired
                                    : cycle;
                              return `${current}/${business.scansRequired} in current cycle`;
                            })()}
                          </Text>
                          {earned && (
                            <View style={styles.rewardBadge}>
                              <Gift size={16} color={colors.success} />
                              <Text style={styles.rewardText}>Reward Earned!</Text>
                            </View>
                          )}
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <ScanHistory />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Nearby Businesses"
              subtitle="Discover new places to earn rewards"
              icon={<MapPin size={20} color={colors.primary} />}
            />

            {nearbyBusinesses.length === 0 ? (
              <GlassCard>
                <EmptyState
                  icon={<Building2 size={36} color={colors.textMuted} />}
                  title="No Businesses Found"
                  description="There are no registered businesses in your area yet."
                />
              </GlassCard>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessList}>
                {nearbyBusinesses.map((business) => (
                  <TouchableOpacity
                    key={business.id}
                    onPress={() => router.push(`/business/${business.id}`)}
                  >
                    <GlassCard style={[styles.nearbyCard, business.isPremium && styles.premiumCard]} noPadding>
                      {business.isPremium && (
                        <View style={styles.premiumBadge}>
                          <Star size={12} color={colors.white} fill={colors.white} />
                          <Text style={styles.premiumText}>Premium</Text>
                        </View>
                      )}
                      <Image
                        source={{
                          uri:
                            business.imageUrl ||
                            business.logoUrl ||
                            'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80',
                        }}
                        style={styles.nearbyImage}
                      />
                      <View style={styles.nearbyInfo}>
                        <Text style={styles.nearbyName}>{business.name}</Text>
                        <Text style={styles.nearbyType}>{business.type}</Text>
                        <View style={styles.detailRow}>
                          <MapPin size={16} color={colors.primary} />
                          <Text style={styles.distanceText}>
                            {business.distance !== undefined
                              ? formatDistance(business.distance)
                              : 'Nearby'}
                          </Text>
                        </View>
                        {business.rating && (
                          <View style={styles.ratingContainer}>
                            <Star size={16} color={colors.warning} fill={colors.warning} />
                            <Text style={styles.ratingText}>{business.rating.toFixed(1)}</Text>
                          </View>
                        )}
                        <View style={styles.viewButton}>
                          <Text style={styles.viewButtonText}>View Details</Text>
                          <ChevronRight size={16} color={colors.primaryDark} />
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
      </ScreenContainer>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcomeSection: { padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  welcomeSubtitle: { ...typography.caption, textAlign: 'center', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  section: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 20, marginBottom: spacing.md },
  loadingText: { ...typography.caption, textAlign: 'center', padding: spacing.md },
  errorText: { color: colors.error, textAlign: 'center', padding: spacing.md },
  businessList: { gap: spacing.md, paddingRight: spacing.md },
  businessCard: { width: 300 },
  businessHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  businessLogo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.sm },
  businessInfo: { flex: 1 },
  businessName: { ...typography.h3, fontSize: 16 },
  lastScanned: { ...typography.caption, fontSize: 12, marginTop: 2 },
  progressContainer: { alignItems: 'center' },
  progressCircles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.sm },
  progressIcon: { marginHorizontal: 2, marginVertical: 2 },
  progressText: { ...typography.caption, marginBottom: spacing.sm },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rewardText: { fontSize: 14, fontWeight: '600', color: colors.success },
  nearbyCard: { width: 280, overflow: 'hidden' },
  premiumCard: { borderColor: colors.primary, borderWidth: 2 },
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  premiumText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  nearbyImage: { width: '100%', height: 140, resizeMode: 'cover' },
  nearbyInfo: { padding: spacing.md },
  nearbyName: { ...typography.h3, fontSize: 17 },
  nearbyType: { ...typography.caption, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  distanceText: { ...typography.caption },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  ratingText: { color: colors.warning, fontWeight: '600', fontSize: 14 },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    gap: 4,
  },
  viewButtonText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
});
