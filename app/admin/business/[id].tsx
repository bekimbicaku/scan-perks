import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { loadAdminBusinessDetail, type AdminBusinessRow } from '@/lib/adminMetrics';
import { setBusinessPriceOverride } from '@/lib/adminApi';
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
  const [amountUsd, setAmountUsd] = useState('10');
  const [months, setMonths] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!businessId) {
      setError('Missing business id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const row = await loadAdminBusinessDetail(businessId);
      if (!row) {
        setError('Business not found');
        setBusiness(null);
      } else {
        setBusiness(row);
        if (row.priceOverride?.amountUsd) {
          setAmountUsd(String(row.priceOverride.amountUsd));
        } else if (row.catalogMonthlyUsd) {
          setAmountUsd(String(row.catalogMonthlyUsd));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const owner = business?.owner;
  const monthsInt = Math.floor(Number(months));
  const amountNum = Number(amountUsd);
  const periodLabel =
    Number.isFinite(monthsInt) && monthsInt > 0
      ? `After ${monthsInt} billing cycle${monthsInt === 1 ? '' : 's'}, Stripe schedule reverts to the original price.`
      : 'Override is kept until you change it again (no automatic revert).';

  const applyOverride = async () => {
    if (!business) return;
    setBusy(true);
    setActionError(null);
    setActionOk(null);
    try {
      const result = await setBusinessPriceOverride({
        businessId: business.id,
        amountUsd: amountNum,
        months: Number.isFinite(monthsInt) ? monthsInt : 0,
      });
      setConfirmOpen(false);
      setActionOk(
        result.periodEndBehavior === 'revert_after_months'
          ? `Override set to $${result.amountUsd}/mo for ${result.months} cycle(s); then reverts.`
          : `Override set to $${result.amountUsd}/mo and will keep until changed again.`
      );
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Override failed');
    } finally {
      setBusy(false);
    }
  };

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
            <Detail label="Subscription status" value={business.subscriptionStatus || '—'} />
            <Detail label="Paying (Stripe)" value={business.isPayingStripe ? 'Yes' : 'No'} />
            <Detail label="Active" value={business.isActive ? 'Yes' : 'No'} />
            <Detail label="Customers" value={String(business.customerCount)} />
            <Detail label="Scans" value={String(business.totalScans)} />
            <Detail label="Scans last 7d" value={String(business.scansLast7d)} />
            <Detail label="Scans prior 7d" value={String(business.scansPrior7d)} />
            <Detail label="Last scan" value={formatDate(business.lastScanAt)} />
            <Detail label="Created" value={formatDate(business.createdAt)} />
            <Detail
              label="Trial ends"
              value={
                business.trialEndsAt
                  ? `${formatDate(business.trialEndsAt)} (${remainingTrialDays(business.trialEndsAt)}d left)`
                  : '—'
              }
            />
            <Detail label="Business id" value={business.id} />
          </View>

          <Text style={styles.ownerHeading}>Owner</Text>
          <View style={styles.grid}>
            <Detail label="Name" value={owner?.name || '—'} />
            <Detail label="Email" value={owner?.email || business.email || '—'} />
            <Detail label="UID" value={business.ownerId} />
            <Detail label="Owner plan status" value={owner?.planStatus || '—'} />
            <Detail label="Subscribed" value={owner?.subscribed ? 'Yes' : 'No'} />
            <Detail label="Stripe customer" value={owner?.stripeCustomerId || '—'} />
            <Detail label="Stripe subscription" value={owner?.stripeSubscriptionId || '—'} />
            <Detail
              label="Lifetime paid (stored)"
              value={
                owner && owner.lifetimePaidCents > 0
                  ? `$${(owner.lifetimePaidCents / 100).toFixed(2)}`
                  : '—'
              }
            />
            <Detail label="Last payment" value={formatDate(owner?.lastPaymentAt || null)} />
            <Detail label="Last login" value={formatDate(owner?.lastLoginAt || null)} />
            <Detail label="Last seen" value={formatDate(owner?.lastSeenAt || null)} />
          </View>

          <Text style={styles.ownerHeading}>Price override</Text>
          {business.priceOverride ? (
            <Text style={styles.hint}>
              Current override: ${business.priceOverride.amountUsd}/mo ·{' '}
              {business.priceOverride.periodEndBehavior || '—'} · set{' '}
              {formatDate(business.priceOverride.setAt)}
            </Text>
          ) : (
            <Text style={styles.hint}>No override on file. Requires an active Stripe subscription.</Text>
          )}
          <Text style={styles.fieldLabel}>Monthly price (USD)</Text>
          <TextInput
            style={styles.input}
            value={amountUsd}
            onChangeText={setAmountUsd}
            keyboardType="decimal-pad"
            placeholder="10"
            placeholderTextColor={stamp.input}
          />
          <Text style={styles.fieldLabel}>Months (0 = keep until changed)</Text>
          <TextInput
            style={styles.input}
            value={months}
            onChangeText={setMonths}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={stamp.input}
          />
          <Text style={styles.hint}>{periodLabel}</Text>
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          {actionOk ? <Text style={styles.ok}>{actionOk}</Text> : null}
          <TouchableOpacity
            style={[styles.linkButton, (!owner?.stripeSubscriptionId || busy) && styles.disabled]}
            disabled={!owner?.stripeSubscriptionId || busy}
            onPress={() => {
              setActionError(null);
              if (!Number.isFinite(amountNum) || amountNum < 1) {
                setActionError('Enter a price of at least $1');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            <Text style={styles.linkText}>Set Stripe price override…</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/admin/users')}>
            <Text style={styles.linkText}>Manage users (ban / delete owner)</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !busy && setConfirmOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Confirm billing change</Text>
            <Text style={styles.modalBody}>
              Charge {business?.name || 'this venue'} ${Number.isFinite(amountNum) ? amountNum : '—'}
              /month via Stripe
              {Number.isFinite(monthsInt) && monthsInt > 0
                ? ` for ${monthsInt} billing cycle(s), then revert to the original price.`
                : ', and keep that price until you change it again.'}
            </Text>
            <Text style={styles.modalBody}>
              No proration invoice is created. The new amount applies on subsequent invoices / scheduled
              phases.
            </Text>
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                disabled={busy}
                onPress={() => setConfirmOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} disabled={busy} onPress={applyOverride}>
                {busy ? (
                  <ActivityIndicator color={stamp.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm override</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  ok: {
    fontFamily: outfit.medium,
    color: stamp.mintText,
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
  ownerHeading: {
    fontFamily: outfit.bold,
    fontSize: 16,
    color: stamp.deep,
    marginTop: 8,
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
  fieldLabel: {
    fontFamily: outfit.medium,
    fontSize: 13,
    color: stamp.deep,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: outfit.regular,
    fontSize: 15,
    color: stamp.deep,
    backgroundColor: stamp.mist,
  },
  hint: {
    fontFamily: outfit.regular,
    fontSize: 12,
    color: stamp.muted,
    lineHeight: 18,
  },
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: stamp.skyTint,
  },
  disabled: { opacity: 0.45 },
  linkText: {
    fontFamily: outfit.semibold,
    color: stamp.deep,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: stamp.white,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontFamily: outfit.bold,
    fontSize: 18,
    color: stamp.deep,
  },
  modalBody: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stamp.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: outfit.semibold,
    color: stamp.deep,
  },
  modalConfirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: stamp.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: outfit.semibold,
    color: stamp.white,
  },
});
