import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { Users, UserX, UserCheck } from 'lucide-react-native';
import { db } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import { colors, spacing, typography } from '@/theme';

interface CustomerSegmentationProps {
  businessId: string;
}

interface Segment {
  label: string;
  count: number;
  icon: React.ReactNode;
}

export default function CustomerSegmentation({ businessId }: CustomerSegmentationProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSegments();
  }, [businessId]);

  const loadSegments = async () => {
    try {
      const customersSnap = await getDocs(collection(db, 'businesses', businessId, 'customers'));
      let active = 0;
      let inactive = 0;
      let loyal = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      customersSnap.docs.forEach((customerDoc) => {
        const data = customerDoc.data();
        const totalScans = data.totalScans || 0;
        const lastScan = data.lastScan?.toDate?.() || (data.lastScan instanceof Date ? data.lastScan : null);

        if (totalScans >= 5) loyal++;
        if (lastScan && lastScan >= thirtyDaysAgo) active++;
        else inactive++;
      });

      setSegments([
        {
          label: 'Active (30 days)',
          count: active,
          icon: <UserCheck size={20} color={colors.success} />,
        },
        {
          label: 'Inactive (30+ days)',
          count: inactive,
          icon: <UserX size={20} color={colors.warning} />,
        },
        {
          label: 'Loyal (5+ scans)',
          count: loyal,
          icon: <Users size={20} color={colors.primaryDark} />,
        },
      ]);
    } catch (err) {
      console.error('Error loading segments:', err);
      setSegments([
        { label: 'Active (30 days)', count: 0, icon: <UserCheck size={20} color={colors.success} /> },
        { label: 'Inactive (30+ days)', count: 0, icon: <UserX size={20} color={colors.warning} /> },
        { label: 'Loyal (5+ scans)', count: 0, icon: <Users size={20} color={colors.primaryDark} /> },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <Text style={styles.loading}>Loading customer segments...</Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Segments</Text>
      <View style={styles.row}>
        {segments.map((seg) => (
          <GlassCard key={seg.label} style={styles.card}>
            {seg.icon}
            <Text style={styles.count}>{seg.count}</Text>
            <Text style={styles.label}>{seg.label}</Text>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  card: { flex: 1, alignItems: 'center', minHeight: 100 },
  count: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: spacing.sm },
  label: { ...typography.caption, fontSize: 11, textAlign: 'center', marginTop: 4 },
  loading: { ...typography.caption, textAlign: 'center' },
});
