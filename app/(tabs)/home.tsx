import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Platform,
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
import { auth, getDb } from '@/lib/firebase';
import {
  MapPin,
  Star,
  ChevronRight,
  Building2,
  Trophy,
  Gift,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import ScanHistory from '@/components/ScanHistory';
import CustomerEngagementCard from '@/components/CustomerEngagementCard';
import NotificationPermissionCard from '@/components/NotificationPermissionCard';
import InviteFriendsCard from '@/components/InviteFriendsCard';
import EmptyMarketHome from '@/components/EmptyMarketHome';
import LiveVenueCard from '@/components/LiveVenueCard';
import BirthdayTreatCard from '@/components/BirthdayTreatCard';
import FavoriteBusinesses from '@/components/FavoriteBusinesses';
import LocalPassportCard from '@/components/LocalPassportCard';
import BrandLogo from '@/components/ui/BrandLogo';
import SectionHeader from '@/components/ui/SectionHeader';
import StatCard from '@/components/ui/StatCard';
import { getLoyaltySettings, DEFAULT_SCANS_REQUIRED } from '@/lib/loyalty';
import { haversineDistanceKm, formatDistance } from '@/lib/geo';
import { claimJoinStamps } from '@/lib/joinStamp';
import { isVenueLive } from '@/lib/trial';
import { colors, spacing, typography, radius, stamp, outfit, personMark } from '@/theme';

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
  isActive?: boolean;
  planStatus?: string;
  trialEndsAt?: unknown;
}

interface FeaturedVenue extends NearbyBusiness {
  reward: string;
  scansRequired: number;
}

export default function HomeScreen() {
  const [scannedBusinesses, setScannedBusinesses] = useState<Business[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusiness[]>([]);
  const [featuredVenue, setFeaturedVenue] = useState<FeaturedVenue | null>(null);
  const [marketReady, setMarketReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [isReady] = useFrameworkReady();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isReady || !navigationState?.key) return;

    const checkAuth = async () => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }
      try {
        await claimJoinStamps(auth.currentUser.uid);
      } catch (err) {
        console.warn('[join-stamp]', err);
      }
      loadUserData();
      getDoc(doc(getDb(), 'users', auth.currentUser.uid))
        .then((userDoc) => {
          const name =
            (userDoc.exists() ? userDoc.data().name : '') ||
            auth.currentUser?.email?.split('@')[0] ||
            '';
          setFirstName(String(name).trim().split(/\s+/)[0] || '');
        })
        .catch(() => {
          setFirstName(auth.currentUser?.email?.split('@')[0] || '');
        });
    };
    checkAuth();
  }, [isReady, navigationState?.key]);

  const loadUserData = useCallback(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(getDb(), 'users', auth.currentUser.uid, 'scans');
    const scansQuery = query(scansRef, orderBy('lastScan', 'desc'));

    const unsubscribe = onSnapshot(
      scansQuery,
      {
        next: async (snapshot) => {
          try {
            let points = 0;
            const promises = snapshot.docs.map(async (scanDoc) => {
              const businessRef = doc(getDb(), 'businesses', scanDoc.id);
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
      if (Platform.OS === 'web') {
        loadNearbyBusinesses();
      } else {
        initLocation();
      }
    }
  }, [isReady]);

  useEffect(() => {
    if (userLocation) loadNearbyBusinesses();
  }, [userLocation]);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      } else {
        loadNearbyBusinesses();
      }
    } catch {
      loadNearbyBusinesses();
    }
  };

  const loadNearbyBusinesses = async () => {
    try {
      const businessesQuery = query(
        collection(getDb(), 'businesses'),
        where('isActive', '==', true),
        orderBy('__name__'),
        limit(15)
      );

      const snapshot = await getDocs(businessesQuery);
      let loaded = snapshot.docs
        .map((d) => ({
          ...(d.data() as Omit<NearbyBusiness, 'id'>),
          id: d.id,
        }))
        .filter((business) => isVenueLive(business));

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

      const visible = loaded.slice(0, 10);
      setNearbyBusinesses(visible);
      const first = visible[0];
      if (first) {
        const loyalty = await getLoyaltySettings(first.id);
        setFeaturedVenue({
          ...first,
          reward: loyalty.reward,
          scansRequired: loyalty.scansRequired,
        });
      } else {
        setFeaturedVenue(null);
      }
    } catch (err) {
      console.error('Error loading nearby businesses:', err);
      setFeaturedVenue(null);
    } finally {
      setMarketReady(true);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNearbyBusinesses();
    setRefreshing(false);
  }, [userLocation]);

  const loadNearbyRef = useRef(loadNearbyBusinesses);
  loadNearbyRef.current = loadNearbyBusinesses;
  useFocusEffect(
    useCallback(() => {
      if (!isReady || !auth.currentUser) return;
      void loadNearbyRef.current();
    }, [isReady])
  );

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

  const hasCard = scannedBusinesses.length > 0;
  const otherNearby = nearbyBusinesses.filter((business) => business.id !== featuredVenue?.id);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const venueProgress = featuredVenue
    ? scannedBusinesses.find((business) => business.id === featuredVenue.id)?.totalScans ?? 0
    : 0;

  if (!isReady || !navigationState?.key) {
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
      <ScreenContainer
        scroll
        contentStyle={styles.tabSpace}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={stamp.sky} />,
        }}
      >
          <View style={styles.topBar}>
            <BrandLogo size="sm" centered={false} />
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <LinearGradient
                colors={[stamp.sky, stamp.deep]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{personMark(firstName)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>{greeting}{firstName ? `,\n${firstName}` : ''}</Text>
            <Text style={styles.welcomeSubtitle}>Earn rewards at local businesses worldwide</Text>
            <View style={styles.statsRow}>
              <StatCard icon={<Trophy size={22} color={stamp.deep} />} label="Total Points" value={totalPoints} iconBg={stamp.skyTint} />
              <StatCard icon={<Gift size={22} color={stamp.mintText} />} label="Businesses" value={scannedBusinesses.length} iconBg={stamp.mintBg} />
            </View>
          </View>

          {featuredVenue ? (
            <View style={styles.section}>
              <LiveVenueCard
                name={featuredVenue.name}
                type={featuredVenue.type}
                reward={featuredVenue.reward}
                scansRequired={featuredVenue.scansRequired}
                totalScans={venueProgress}
                onOpen={() => router.push(`/business/${featuredVenue.id}`)}
                onScan={() => router.push('/scan')}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <NotificationPermissionCard />
          </View>

          <View style={styles.section}>
            <BirthdayTreatCard />
          </View>

          {hasCard ? (
            <View style={styles.section}>
              <InviteFriendsCard />
            </View>
          ) : null}

          {hasCard ? (
            <View style={styles.section}>
              <CustomerEngagementCard hasCard />
            </View>
          ) : null}

          <FavoriteBusinesses />

          {hasCard ? <LocalPassportCard /> : null}

          {!loading && !error && !hasCard && marketReady && !featuredVenue ? (
            <View style={styles.section}>
              <EmptyMarketHome />
            </View>
          ) : null}

          {loading || error || hasCard ? (
          <View style={styles.section}>
            <SectionHeader title="My Scanned Businesses" icon={<Building2 size={20} color={colors.primary} />} />

            {loading ? (
              <Text style={styles.loadingText}>Loading your rewards...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
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
                      <GlassCard stamp style={styles.businessCard}>
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
          ) : null}

          <View style={styles.section}>
            <ScanHistory />
          </View>

          {otherNearby.length > 0 || (marketReady && hasCard && nearbyBusinesses.length === 0) ? (
          <View style={styles.section}>
            <SectionHeader
              title="Nearby Businesses"
              subtitle="Discover new places to earn rewards"
              icon={<MapPin size={20} color={colors.primary} />}
            />

            {otherNearby.length === 0 ? (
              <GlassCard stamp>
                <EmptyState
                  icon={<Building2 size={36} color={colors.textMuted} />}
                  title="No Businesses Found"
                  description="There are no registered businesses in your area yet."
                />
              </GlassCard>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessList}>
                {otherNearby.map((business) => (
                  <TouchableOpacity
                    key={business.id}
                    onPress={() => router.push(`/business/${business.id}`)}
                  >
                    <GlassCard stamp style={[styles.nearbyCard, business.isPremium && styles.premiumCard]} noPadding>
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
          ) : null}
      </ScreenContainer>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabSpace: { paddingBottom: 120 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stamp.deep,
  },
  avatarText: { fontFamily: outfit.extra, fontSize: 18, color: stamp.white },
  welcomeSection: { paddingHorizontal: 20, paddingTop: 18, gap: 8 },
  greeting: {
    fontFamily: outfit.extra,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1,
    color: stamp.deep,
  },
  welcomeSubtitle: { fontFamily: outfit.regular, fontSize: 16, color: stamp.muted, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', maxWidth: '100%' },
  section: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 20, marginBottom: spacing.md },
  loadingText: { ...typography.caption, textAlign: 'center', padding: spacing.md },
  errorText: { color: colors.error, textAlign: 'center', padding: spacing.md },
  businessList: { gap: spacing.md, paddingRight: spacing.md },
  businessCard: { width: 280, maxWidth: 300 },
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
  nearbyCard: { width: 260, maxWidth: 280, overflow: 'hidden' },
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
