import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { loadAdminBusinessDetail, type AdminBusinessRow } from '@/lib/adminMetrics';
import { remainingTrialDays } from '@/lib/trial';
import { stamp, outfit } from '@/theme';

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleString();
}

export default function AdminBusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const [business, setBusiness] = useState<AdminBusinessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!businessId) {
        setError('Missing business id');
        setLoading(false);
        return;
      }
      try {
        const row = await loadAdminBusinessDetail(businessId);
        if (!alive) return;
        if (!row) {
          setError('Business not found');
        } else {
          setBusiness(row);
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load business');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [businessId]);

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={18} color={stamp.deep} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={stamp.sky} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {business ? (
        <View style={styles.card}>
          <Text style={styles.title}>{business.name}</Text>
          <Text style={styles.sub}>{business.email || 'No email on file'}</Text>

          <View style={styles.grid}>
            <Detail label="Plan" value={`${business.plan} · ${business.planStatus}`} />
            <Detail label="Active" value={business.isActive ? 'Yes' : 'No'} />
            <Detail label="Customers" value={String(business.customerCount)} />
            <Detail label="Scans" value={String(business.totalScans)} />
            <Detail label="Created" value={formatDate(business.createdAt)} />
            <Detail
              label="Trial ends"
              value={
                business.trialEndsAt
                  ? `${formatDate(business.trialEndsAt)} (${remainingTrialDays(business.trialEndsAt)}d left)`
                  : '—'
              }
            />
            <Detail label="Owner id" value={business.ownerId} />
            <Detail label="Business id" value={business.id} />
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/admin/users')}>
            <Text style={styles.linkText}>Manage users (ban / delete owner)</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: outfit.medium,
    fontSize: 14,
    color: stamp.deep,
  },
  center: { paddingVertical: 40, alignItems: 'center' },
  error: {
    fontFamily: outfit.medium,
    color: stamp.danger,
    fontSize: 14,
  },
  card: {
    backgroundColor: stamp.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 18,
    gap: 10,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 26,
    color: stamp.deep,
  },
  sub: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
    marginBottom: 8,
  },
  grid: { gap: 12 },
  detail: { gap: 2 },
  detailLabel: {
    fontFamily: outfit.medium,
    fontSize: 12,
    color: stamp.dash,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontFamily: outfit.semibold,
    fontSize: 15,
    color: stamp.deep,
  },
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: stamp.skyTint,
  },
  linkText: {
    fontFamily: outfit.semibold,
    color: stamp.deep,
  },
});
