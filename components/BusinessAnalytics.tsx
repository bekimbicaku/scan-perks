import { View, Text, StyleSheet, Dimensions, RefreshControl, ScrollView } from 'react-native';
import { Users, QrCode, Gift, CreditCard } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const windowWidth = Dimensions.get('window').width;

interface BusinessAnalyticsProps {
  businessId: string;
}

interface BusinessStats {
  totalScans: number;
  uniqueCustomers: number;
  totalRewards: number;
  redeemedRewards: number;
  activeRewards: number;
}

export default function BusinessAnalytics({ businessId }: BusinessAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BusinessStats>({
    totalScans: 0,
    uniqueCustomers: 0,
    totalRewards: 0,
    redeemedRewards: 0,
    activeRewards: 0,
  });

  useEffect(() => {
    if (!businessId) return;

    // Subscribe to statistics updates
    const statsRef = doc(db, 'businesses', businessId, 'statistics', 'scans');
    const rewardsStatsRef = doc(db, 'businesses', businessId, 'statistics', 'rewards');
    
    const unsubscribeStats = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStats(prev => ({
          ...prev,
          totalScans: data.totalScans || 0,
          uniqueCustomers: data.uniqueCustomers || 0,
        }));
      }
    }, (error) => {
      console.error('Error listening to stats:', error);
    });

    const unsubscribeRewards = onSnapshot(rewardsStatsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStats(prev => ({
          ...prev,
          totalRewards: data.totalRewardsIssued || 0,
          redeemedRewards: data.totalRewardsRedeemed || 0,
          activeRewards: (data.totalRewardsIssued || 0) - (data.totalRewardsRedeemed || 0),
        }));
      }
    }, (error) => {
      console.error('Error listening to rewards stats:', error);
    });

    setLoading(false);

    // Cleanup subscriptions
    return () => {
      unsubscribeStats();
      unsubscribeRewards();
    };
  }, [businessId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Business Analytics</Text>
        <Text style={styles.subtitle}>Track your business performance</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#f0fdfa' }]}>
          <QrCode size={24} color="#0d9488" />
          <Text style={styles.statNumber}>{stats.totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f0f9ff' }]}>
          <Users size={24} color="#0369a1" />
          <Text style={styles.statNumber}>{stats.uniqueCustomers}</Text>
          <Text style={styles.statLabel}>Unique Customers</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#fdf2f8' }]}>
          <Gift size={24} color="#be185d" />
          <Text style={styles.statNumber}>{stats.activeRewards}</Text>
          <Text style={styles.statLabel}>Active Rewards</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <CreditCard size={24} color="#15803d" />
          <Text style={styles.statNumber}>{stats.redeemedRewards}</Text>
          <Text style={styles.statLabel}>Redeemed Rewards</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewards Overview</Text>
        <View style={styles.rewardsOverview}>
          <View style={styles.rewardMetric}>
            <Text style={styles.metricValue}>{stats.totalRewards}</Text>
            <Text style={styles.metricLabel}>Total Rewards Generated</Text>
          </View>
          <View style={styles.rewardMetric}>
            <Text style={styles.metricValue}>
              {stats.totalRewards > 0
                ? ((stats.redeemedRewards / stats.totalRewards) * 100).toFixed(1)
                : '0.0'}%
            </Text>
            <Text style={styles.metricLabel}>Redemption Rate</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    width: (windowWidth - 50) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
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
  rewardsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
  },
  rewardMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});