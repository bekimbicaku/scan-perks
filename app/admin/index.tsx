import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Building2, CreditCard, Timer, Users, QrCode, ShieldBan, Search } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import StatCard from '@/components/ui/StatCard';
import { loadAdminDashboardMetrics, type AdminDashboardMetrics, type AdminBusinessRow } from '@/lib/adminMetrics';
import { remainingTrialDays } from '@/lib/trial';
import { stamp, outfit } from '@/theme';

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString();
}

function planLabel(row: AdminBusinessRow): string {
  if (row.planStatus === 'trial') {
    const days = remainingTrialDays(row.trialEndsAt);
    return days > 0 ? `Trial · ${days}d left` : 'Trial ended';
  }
  if (row.planStatus === 'active') {
    return `Paid · ${row.plan}`;
  }
  return row.planStatus || 'unknown';
}

export default function AdminDashboardScreen() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await loadAdminDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBusinesses = useMemo(() => {
    const rows = metrics?.businesses || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
    );
  }, [metrics, search]);

  return (
    <ScreenContainer
      scroll
      scrollProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />,
      }}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ScanPerks</Text>
          <Text style={styles.title}>Platform admin</Text>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/admin/users')}>
          <Users size={18} color={stamp.deep} />
          <Text style={styles.navButtonText}>Users</Text>
        </TouchableOpacity>
      </View>

      {loading && !metrics ? (
        <View style={styles.center}>
          <ActivityIndicator color={stamp.sky} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metrics ? (
        <>
          <View style={styles.statsRow}>
            <StatCard
              icon={<Building2 size={20} color={stamp.deep} />}
              label="Businesses"
              value={metrics.businessesSignedUp}
            />
            <StatCard
              icon={<Timer size={20} color={stamp.amberText} />}
              label="On trial"
              value={metrics.onTrial}
              iconBg={stamp.amberBg}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<CreditCard size={20} color={stamp.mintText} />}
              label="Paid active"
              value={metrics.paidActive}
              iconBg={stamp.mintBg}
            />
            <StatCard
              icon={<Users size={20} color={stamp.deep} />}
              label="Customers"
              value={metrics.totalCustomers}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<QrCode size={20} color={stamp.deep} />}
              label="Total scans"
              value={metrics.totalScans}
            />
            <StatCard
              icon={<ShieldBan size={20} color={stamp.danger} />}
              label="Banned users"
              value={metrics.bannedUsers}
              iconBg="#FEE2E2"
            />
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>
              {metrics.totalUsers} profiles · {metrics.trialExpiringSoon} trials end in ≤3 days ·{' '}
              {metrics.inactiveOrCancelled} inactive/cancelled
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Businesses</Text>
          <View style={styles.searchWrap}>
            <Search size={18} color={stamp.input} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email, or id"
              placeholderTextColor={stamp.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {filteredBusinesses.length === 0 ? (
            <Text style={styles.empty}>No businesses match.</Text>
          ) : (
            filteredBusinesses.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.row}
                onPress={() => router.push(`/admin/business/${row.id}`)}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{row.name}</Text>
                  <Text style={styles.rowSub}>{planLabel(row)}</Text>
                  <Text style={styles.rowMeta}>
                    {row.customerCount} customers · {row.totalScans} scans · joined{' '}
                    {formatDate(row.createdAt)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kicker: {
    fontFamily: outfit.semibold,
    fontSize: 13,
    color: stamp.sky,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 28,
    color: stamp.deep,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: stamp.white,
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navButtonText: {
    fontFamily: outfit.semibold,
    fontSize: 14,
    color: stamp.deep,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  error: {
    fontFamily: outfit.medium,
    color: stamp.danger,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBlock: {
    backgroundColor: stamp.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 12,
  },
  metaText: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
  },
  sectionTitle: {
    fontFamily: outfit.bold,
    fontSize: 18,
    color: stamp.deep,
    marginTop: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stamp.white,
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: outfit.regular,
    fontSize: 15,
    color: stamp.deep,
    paddingVertical: 10,
  },
  empty: {
    fontFamily: outfit.regular,
    color: stamp.muted,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stamp.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 14,
    gap: 8,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: {
    fontFamily: outfit.semibold,
    fontSize: 16,
    color: stamp.deep,
  },
  rowSub: {
    fontFamily: outfit.medium,
    fontSize: 13,
    color: stamp.sky,
  },
  rowMeta: {
    fontFamily: outfit.regular,
    fontSize: 12,
    color: stamp.muted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: stamp.dash,
    lineHeight: 28,
  },
});
