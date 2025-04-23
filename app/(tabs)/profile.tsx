import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { router, useRootNavigationState } from 'expo-router';
import { LogOut, Gift, Tag, ChevronRight, Users, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import DeleteAccountModal from '@/components/DeleteAccountModal';

interface Offer {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  title: string;
  description: string;
  validUntil: Date;
}

export default function ProfileScreen() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRewards: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use navigation state to check if navigation is ready
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Only check auth after navigation is ready
    if (!navigationState?.key) return;

    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    // Load user stats
    const userStatsRef = collection(db, 'users', auth.currentUser.uid, 'scans');
    const unsubscribeStats = onSnapshot(userStatsRef, (snapshot) => {
      const points = snapshot.docs.reduce((total, doc) => total + (doc.data().totalScans || 0), 0);
      const rewards = Math.floor(points / 10); // 1 reward per 10 points
      setStats({ totalPoints: points, totalRewards: rewards });
    });

    // Load scanned businesses
    const loadScannedBusinesses = async () => {
      try {
        const scansRef = collection(db, 'users', auth.currentUser.uid, 'scans');
        const scansSnapshot = await getDocs(scansRef);
        const businessIds = scansSnapshot.docs.map(doc => doc.id);

        if (businessIds.length === 0) {
          setLoading(false);
          return;
        }

        // Get all active offers from scanned businesses
        const offersPromises = businessIds.map(async (businessId) => {
          const businessRef = collection(db, 'businesses', businessId, 'offers');
          const offersQuery = query(
            businessRef,
            where('validUntil', '>', new Date())
          );
          const offersSnapshot = await getDocs(offersQuery);
          
          // Get business details
          const businessDoc = await getDocs(collection(db, 'businesses'));
          const businessData = businessDoc.docs.find(doc => doc.id === businessId)?.data();

          return offersSnapshot.docs.map(doc => ({
            id: doc.id,
            businessId,
            businessName: businessData?.name || 'Unknown Business',
            businessLogo: businessData?.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80',
            ...doc.data(),
            validUntil: doc.data().validUntil.toDate(),
          }));
        });

        const allOffers = await Promise.all(offersPromises);
        setOffers(allOffers.flat().sort((a, b) => a.validUntil.getTime() - b.validUntil.getTime()));
        setLoading(false);
      } catch (err) {
        console.error('Error loading offers:', err);
        setError('Failed to load offers');
        setLoading(false);
      }
    };

    loadScannedBusinesses();
    return () => unsubscribeStats();
  }, [navigationState?.key]); // Only run effect when navigation is ready

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (navigationState?.key) {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state while navigation is initializing
  if (!navigationState?.key) {
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalRewards}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
        </View>

        <View style={styles.offersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Offers</Text>
            <Tag size={20} color="#0891b2" />
          </View>

          {loading ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>Loading offers...</Text>
            </View>
          ) : error ? (
            <View style={styles.messageContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : offers.length === 0 ? (
            <View style={styles.messageContainer}>
              <Gift size={48} color="#64748b" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No current offers available</Text>
              <Text style={styles.emptySubtext}>
                Scan more businesses to discover their offers!
              </Text>
            </View>
          ) : (
            <View style={styles.offersList}>
              {offers.map((offer) => (
                <TouchableOpacity key={offer.id} style={styles.offerCard}>
                  <Image
                    source={{ uri: offer.businessLogo }}
                    style={styles.businessLogo}
                  />
                  <View style={styles.offerContent}>
                    <View style={styles.offerHeader}>
                      <Text style={styles.businessName}>{offer.businessName}</Text>
                      <ChevronRight size={20} color="#64748b" />
                    </View>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <Text style={styles.offerDescription} numberOfLines={2}>
                      {offer.description}
                    </Text>
                    <Text style={styles.validUntil}>
                      Valid until: {offer.validUntil.toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.accountActions}>
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]} 
            onPress={() => setShowDeleteModal(true)}
          >
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.signOutButton]} 
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#64748b" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
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
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  offersSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  offersList: {
    gap: 16,
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  businessLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  offerContent: {
    flex: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    color: '#64748b',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  validUntil: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  accountActions: {
    padding: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  signOutButton: {
    backgroundColor: '#f1f5f9',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});