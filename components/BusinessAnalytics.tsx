import { View, Text, StyleSheet } from 'react-native';
import { Users, QrCode, Gift, CreditCard } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import AnalyticsChart from '@/components/AnalyticsChart';
import { stamp, outfit } from '@/theme';

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
    const statsRef = doc(getDb(), 'businesses', businessId, 'statistics', 'scans');
    const rewardsStatsRef = doc(getDb(), 'businesses', businessId, 'statistics', 'rewards');
    
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

    // Cleanup subscriptions
    return () => {
      unsubscribeStats();
      unsubscribeRewards();
    };
  }, [businessId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Analytics</Text>
        <Text style={styles.subtitle}>Track your business performance</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: stamp.white }]}>
          <QrCode size={24} color={stamp.deep} />
          <Text style={styles.statNumber}>{stats.totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: stamp.skyTint }]}>
          <Users size={24} color={stamp.deep} />
          <Text style={styles.statNumber}>{stats.uniqueCustomers}</Text>
          <Text style={styles.statLabel}>Unique Customers</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: stamp.mist }]}>
          <Gift size={24} color={stamp.deep} />
          <Text style={styles.statNumber}>{stats.activeRewards}</Text>
          <Text style={styles.statLabel}>Active Rewards</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: stamp.mintBg }]}>
          <CreditCard size={24} color={stamp.mintText} />
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

      <AnalyticsChart businessId={businessId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 22,
    letterSpacing: -0.4,
    color: stamp.deep,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 22,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: stamp.line,
    minHeight: 112,
  },
  statNumber: {
    fontFamily: outfit.extra,
    fontSize: 28,
    color: stamp.deep,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: outfit.extra,
    fontSize: 18,
    color: stamp.deep,
    marginBottom: 12,
  },
  rewardsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: stamp.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 16,
  },
  rewardMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: outfit.extra,
    fontSize: 24,
    color: stamp.deep,
    marginBottom: 4,
  },
  metricLabel: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
    textAlign: 'center',
  },
});