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
import {
  Building2,
  CreditCard,
  Timer,
  Users,
  QrCode,
  ShieldBan,
  Search,
  DollarSign,
  UserX,
} from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import StatCard from '@/components/ui/StatCard';
import {
  loadAdminDashboardMetrics,
  type AdminDashboardMetrics,
  type AdminBusinessRow,
} from '@/lib/adminMetrics';
import { fetchAdminStripeRevenue, type AdminStripeRevenue } from '@/lib/adminApi';
import { remainingTrialDays } from '@/lib/trial';
import { stamp, outfit } from '@/theme';

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString();
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function ownerLabel(row: AdminBusinessRow): string {
  const owner = row.owner;
  if (!owner) return row.ownerId;
  const name = owner.name?.trim();
  const email = owner.email?.trim() || row.email;
  if (name && email) return `${name} · ${email}`;
  return email || name || owner.uid;
}

function planLabel(row: AdminBusinessRow): string {
  if (row.planStatus === 'trial') {
    const days = remainingTrialDays(row.trialEndsAt);
    return days > 0 ? `Trial · ${days}d left` : 'Trial ended';
  }
  if (row.planStatus === 'active') {
    return `Paid · ${row.plan}${row.isPayingStripe ? ' · Stripe' : ''}`;
  }
  return row.planStatus || 'unknown';
}

export default function AdminDashboardScreen() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [stripeRevenue, setStripeRevenue] = useState<AdminStripeRevenue | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setStripeError(null);
    try {
      const data = await loadAdminDashboardMetrics();
      setMetrics(data);
      try {
        const revenue = await fetchAdminStripeRevenue();
        setStripeRevenue(revenue);
      } catch (err) {
        setStripeRevenue(null);
        setStripeError(err instanceof Error ? err.message : 'Stripe revenue unavailable');
      }
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
    return rows.filter((row) => {
      const owner = row.owner;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        row.ownerId.toLowerCase().includes(q) ||
        (owner?.email || '').toLowerCase().includes(q) ||
        (owner?.name || '').toLowerCase().includes(q)
      );
    });
  }, [metrics, search]);

  const scanDelta =
    metrics && metrics.scansPrior7d > 0
      ? Math.round(((metrics.scansLast7d - metrics.scansPrior7d) / metrics.scansPrior7d) * 100)
      : null;

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
              icon={<DollarSign size={20} color={stamp.mintText} />}
              label="Catalog MRR"
              value={formatUsd(metrics.catalogMrrUsd)}
              iconBg={stamp.mintBg}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<Users size={20} color={stamp.deep} />}
              label="Customers"
              value={metrics.totalCustomers}
            />
            <StatCard
              icon={<QrCode size={20} color={stamp.deep} />}
              label="Total scans"
              value={metrics.totalScans}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<ShieldBan size={20} color={stamp.danger} />}
              label="Banned users"
              value={metrics.bannedUsers}
              iconBg="#FEE2E2"
            />
            <StatCard
              icon={<UserX size={20} color={stamp.danger} />}
              label="Cancelled subs"
              value={metrics.cancelledSubscriptions}
              iconBg="#FEE2E2"
            />
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>Revenue</Text>
            <Text style={styles.metaText}>
              Catalog MRR {formatUsd(metrics.catalogMrrUsd)} from {metrics.payingBusinesses.length}{' '}
              paying venues (Starter $10 / Growth $15 × active Stripe subscribers).
            </Text>
            {stripeRevenue ? (
              <Text style={styles.metaText}>
                Stripe live: MRR {formatUsd(stripeRevenue.mrrUsd)} · all-time paid{' '}
                {formatUsd(stripeRevenue.allTimePaidUsd)} · {stripeRevenue.activeSubscriptions}{' '}
                active subs ({stripeRevenue.invoicesScanned} invoices scanned).
              </Text>
            ) : (
              <Text style={styles.metaMuted}>
                Stripe live totals unavailable
                {stripeError ? `: ${stripeError}` : ''}. Deploy `platformAdmin` with the revenue
                action for invoice-backed numbers.
              </Text>
            )}
            {metrics.storedLifetimePaidCents > 0 ? (
              <Text style={styles.metaText}>
                Stored lifetime (webhook): {formatUsd(metrics.storedLifetimePaidCents / 100)}
              </Text>
            ) : (
              <Text style={styles.metaMuted}>
                No webhook-stored lifetime paid yet (`users.lifetimePaidCents` fills on future
                invoice.paid events).
              </Text>
            )}
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>Growth signals</Text>
            <Text style={styles.metaText}>
              Trials: {metrics.trialsStarted} started · {metrics.trialsConverted} converted ·{' '}
              {metrics.trialsExpiredUnpaid} expired unpaid · {metrics.trialExpiringSoon} end in ≤3
              days
            </Text>
            <Text style={styles.metaText}>
              Stale: {metrics.staleVenues} venues (0 customers or no scan in 14d) ·{' '}
              {metrics.staleOwners} owners with no login/seen in 14d ·{' '}
              {metrics.inactiveOrCancelled} inactive/cancelled venues
            </Text>
            <Text style={styles.metaText}>
              Scans last 7d: {metrics.scansLast7d} vs prior 7d: {metrics.scansPrior7d}
              {scanDelta !== null ? ` (${scanDelta >= 0 ? '+' : ''}${scanDelta}%)` : ''}
            </Text>
            <Text style={styles.metaMuted}>
              {metrics.totalUsers} profiles · {metrics.bannedUsers} banned
            </Text>
          </View>

          {metrics.payingBusinesses.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Paying venues</Text>
              {metrics.payingBusinesses.map((row) => (
                <TouchableOpacity
                  key={`pay-${row.id}`}
                  style={styles.row}
                  onPress={() => router.push(`/admin/business/${row.id}`)}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <Text style={styles.rowSub}>
                      {row.plan} · {formatUsd(row.catalogMonthlyUsd)}/mo ·{' '}
                      {row.owner?.stripeSubscriptionId
                        ? `sub ${row.owner.stripeSubscriptionId.slice(0, 14)}…`
                        : 'subscribed'}
                    </Text>
                    <Text style={styles.rowMeta}>{ownerLabel(row)}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Businesses</Text>
          <View style={styles.searchWrap}>
            <Search size={18} color={stamp.input} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, owner email, or id"
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
                    Owner: {ownerLabel(row)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {row.customerCount} customers · {row.totalScans} scans · 7d {row.scansLast7d} ·
                    last scan {formatDate(row.lastScanAt)} · joined {formatDate(row.createdAt)}
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
    gap: 6,
  },
  metaTitle: {
    fontFamily: outfit.semibold,
    fontSize: 14,
    color: stamp.deep,
  },
  metaText: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
  },
  metaMuted: {
    fontFamily: outfit.regular,
    fontSize: 12,
    color: stamp.dash,
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
