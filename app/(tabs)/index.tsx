import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { MapPin, Clock, Star, ChevronRight, Building2, QrCode, Trophy, Gift } from 'lucide-react-native';
import * as Location from 'expo-location';
import { router, useRootNavigationState } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

interface Business {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
  totalScans: number;
  lastScan: Date;
}

interface NearbyBusiness extends Business {
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  hours: {
    [key: string]: {
      open: string;
      close: string;
    };
  };
  rating?: number;
  imageUrl: string;
  isPremium: boolean;
  distance?: number;
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
    if (!isReady || !navigationState?.key) {
      return;
    }

    const checkAuth = async () => {
      try {
        if (!auth.currentUser) {
          router.replace('/(auth)/login');
          return;
        }
        loadUserData();
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Authentication error');
      }
    };

    checkAuth();
  }, [isReady, navigationState?.key]);

  const loadUserData = useCallback(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(db, 'users', auth.currentUser.uid, 'scans');
    const scansQuery = query(scansRef, orderBy('lastScan', 'desc'));

    const unsubscribe = onSnapshot(scansQuery, {
      next: async (snapshot) => {
        try {
          const businesses: Business[] = [];
          let points = 0;
          
          const promises = snapshot.docs.map(async (scanDoc) => {
            const businessRef = doc(db, 'businesses', scanDoc.id);
            const businessDoc = await getDoc(businessRef);
            
            if (businessDoc.exists()) {
              const totalScans = scanDoc.data().totalScans || 0;
              points += totalScans;
              
              return {
                id: scanDoc.id,
                name: businessDoc.data().name,
                type: businessDoc.data().type,
                logoUrl: businessDoc.data().logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80',
                totalScans,
                lastScan: scanDoc.data().lastScan?.toDate() || new Date(),
              };
            }
            return null;
          });

          const results = await Promise.all(promises);
          const validBusinesses = results.filter((b): b is Business => b !== null);

          setTotalPoints(points);
          setScannedBusinesses(validBusinesses);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching businesses:', err);
          setError('Failed to load scanned businesses');
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('Snapshot error:', err);
        setError('Failed to load scanned businesses');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isReady && auth.currentUser) {
      loadNearbyBusinesses();
    }
  }, [userLocation, isReady]);

  const loadNearbyBusinesses = async () => {
    try {
      if (!userLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        }
        return;
      }

      const businessesRef = collection(db, 'businesses');
      // Modified query to use a single orderBy clause to avoid the need for a composite index
      const businessesQuery = query(
        businessesRef,
        where('isActive', '==', true),
        orderBy('__name__'),
        limit(10)
      );

      const snapshot = await getDocs(businessesQuery);
      const loadedBusinesses = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as NearbyBusiness[];

      setNearbyBusinesses(loadedBusinesses);
    } catch (err) {
      console.error('Error loading nearby businesses:', err);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNearbyBusinesses().finally(() => setRefreshing(false));
  }, []);

  const renderProgressCircles = (totalScans: number) => {
    const circles = [];
    const completedScans = Math.min(totalScans, 10);

    for (let i = 0; i < 10; i++) {
      if (i === 9 && completedScans === 10) {
        circles.push(
          <Gift 
            key={i} 
            size={24} 
            color="#16a34a"
            style={styles.progressIcon} 
          />
        );
      } else if (i < completedScans) {
        circles.push(
          <Star 
            key={i} 
            size={24} 
            color="#16a34a"
            fill="#16a34a"
            style={styles.progressIcon} 
          />
        );
      } else {
        circles.push(
          <Star 
            key={i} 
            size={24} 
            color="#cbd5e1"
            style={styles.progressIcon} 
          />
        );
      }
    }

    return circles;
  };

  if (!isReady || !navigationState?.key) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to ScanPerks</Text>
          <View style={styles.pointsCard}>
            <Trophy size={32} color="#0891b2" />
            <View style={styles.pointsInfo}>
              <Text style={styles.pointsTitle}>Total Points</Text>
              <Text style={styles.pointsValue}>{totalPoints}</Text>
            </View>
          </View>
        </View>

        {/* Scanned Businesses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Scanned Businesses</Text>
          
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.loadingText}>Loading your rewards...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : scannedBusinesses.length === 0 ? (
            <View style={styles.emptyState}>
              <QrCode size={48} color="#0891b2" style={styles.emptyStateIcon} />
              <Text style={styles.emptyStateTitle}>Make Your First Scan!</Text>
              <Text style={styles.emptyStateText}>
                Visit any participating business and scan their QR code to start earning rewards.
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.businessList}
            >
              {scannedBusinesses.map((business) => (
                <View key={business.id} style={styles.businessCard}>
                  <View style={styles.businessHeader}>
                    <Image
                      source={{ uri: business.logoUrl }}
                      style={styles.businessLogo}
                    />
                    <View style={styles.businessInfo}>
                      <Text style={styles.businessName}>{business.name}</Text>
                      <Text style={styles.lastScanned}>
                        Last visited: {business.lastScan.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressCircles}>
                      {renderProgressCircles(business.totalScans)}
                    </View>
                    <Text style={styles.progressText}>
                      {business.totalScans}/10 scans completed
                    </Text>
                    {business.totalScans >= 10 && (
                      <View style={styles.rewardBadge}>
                        <Gift size={16} color="#16a34a" />
                        <Text style={styles.rewardText}>Reward Earned!</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Nearby Businesses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Businesses</Text>
          
          {nearbyBusinesses.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#64748b" />
              <Text style={styles.emptyStateTitle}>No Businesses Found</Text>
              <Text style={styles.emptyStateText}>
                There are no registered businesses in your area yet.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.businessList}
            >
              {nearbyBusinesses.map((business) => (
                <TouchableOpacity
                  key={business.id}
                  style={[styles.nearbyCard, business.isPremium && styles.premiumCard]}
                >
                  {business.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Star size={12} color="#fff" fill="#fff" />
                      <Text style={styles.premiumText}>Premium</Text>
                    </View>
                  )}
                  
                  <Image
                    source={{ uri: business.imageUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80' }}
                    style={styles.nearbyImage}
                  />
                  
                  <View style={styles.nearbyInfo}>
                    <Text style={styles.nearbyName}>{business.name}</Text>
                    <Text style={styles.nearbyType}>{business.type}</Text>
                    
                    <View style={styles.detailRow}>
                      <MapPin size={16} color="#64748b" />
                      <Text style={styles.distanceText}>
                        {business.distance ? `${business.distance.toFixed(1)} km` : 'Nearby'}
                      </Text>
                    </View>

                    {business.rating && (
                      <View style={styles.ratingContainer}>
                        <Star size={16} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.ratingText}>{business.rating.toFixed(1)}</Text>
                      </View>
                    )}

                    <View style={styles.viewButton}>
                      <Text style={styles.viewButtonText}>View Details</Text>
                      <ChevronRight size={16} color="#0891b2" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  pointsInfo: {
    marginLeft: 16,
  },
  pointsTitle: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0891b2',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  businessList: {
    gap: 16,
  },
  businessCard: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  lastScanned: {
    fontSize: 14,
    color: '#64748b',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircles: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIcon: {
    marginHorizontal: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  nearbyCard: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCard: {
    borderColor: '#0891b2',
    borderWidth: 2,
  },
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#0891b2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  premiumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nearbyImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  nearbyInfo: {
    padding: 16,
  },
  nearbyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  nearbyType: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#64748b',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0891b2',
  },
});