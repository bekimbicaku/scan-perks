import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { isTrialExpired, remainingTrialDays, toDate } from '@/lib/trial';

/** Catalog prices used at checkout (Starter $10, Growth $15). Not Stripe invoice amounts. */
export const PLAN_MONTHLY_USD: Record<string, number> = {
  basic: 10,
  premium: 15,
};

const STALE_DAYS = 14;

export type AdminOwnerInfo = {
  uid: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
  lastSeenAt: Date | null;
  subscribed: boolean;
  planStatus: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  lifetimePaidCents: number;
  lastPaymentAt: Date | null;
};

export type AdminBusinessRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  planStatus: string;
  subscriptionStatus: string;
  isActive: boolean;
  customerCount: number;
  totalScans: number;
  lastScanAt: Date | null;
  scansLast7d: number;
  scansPrior7d: number;
  trialEndsAt: Date | null;
  createdAt: Date | null;
  ownerId: string;
  owner: AdminOwnerInfo | null;
  catalogMonthlyUsd: number;
  isPayingStripe: boolean;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  planStatus: string;
  subscribed: boolean;
  hasBusiness: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
};

export type AdminDashboardMetrics = {
  businessesSignedUp: number;
  onTrial: number;
  paidActive: number;
  trialExpiringSoon: number;
  inactiveOrCancelled: number;
  totalCustomers: number;
  totalScans: number;
  bannedUsers: number;
  totalUsers: number;
  /** Estimated MRR from plan catalog × active paying venues. */
  catalogMrrUsd: number;
  /** Sum of users.lifetimePaidCents when webhook has stored invoices (cents). */
  storedLifetimePaidCents: number;
  trialsStarted: number;
  trialsConverted: number;
  trialsExpiredUnpaid: number;
  cancelledSubscriptions: number;
  staleVenues: number;
  staleOwners: number;
  scansLast7d: number;
  scansPrior7d: number;
  payingBusinesses: AdminBusinessRow[];
  businesses: AdminBusinessRow[];
};

function isRealBusiness(data: Record<string, unknown>): boolean {
  return Boolean(data.name && data.ownerId);
}

function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function isoDay(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sumDailyScans(
  daily: Record<string, unknown> | undefined,
  fromInclusive: Date,
  toExclusive: Date
): number {
  if (!daily) return 0;
  let total = 0;
  const cursor = new Date(fromInclusive);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(toExclusive);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    const key = isoDay(cursor);
    const day = daily[key];
    if (day && typeof day === 'object' && day !== null) {
      const scans = (day as { scans?: unknown }).scans;
      if (typeof scans === 'number') total += scans;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

function catalogPrice(plan: string): number {
  return PLAN_MONTHLY_USD[plan] ?? PLAN_MONTHLY_USD.basic;
}

function ownerFromUser(
  uid: string,
  data: Record<string, unknown> | undefined
): AdminOwnerInfo {
  return {
    uid,
    name: String(data?.name || ''),
    email: String(data?.email || ''),
    lastLoginAt: toDate(data?.lastLoginAt),
    lastSeenAt: toDate(data?.lastSeenAt),
    subscribed: data?.subscribed === true,
    planStatus: String(data?.planStatus || ''),
    stripeCustomerId: String(data?.stripeCustomerId || ''),
    stripeSubscriptionId: String(data?.stripeSubscriptionId || ''),
    lifetimePaidCents:
      typeof data?.lifetimePaidCents === 'number' ? data.lifetimePaidCents : 0,
    lastPaymentAt: toDate(data?.lastPayment),
  };
}

async function loadBusinessStats(businessId: string): Promise<{
  customers: number;
  scans: number;
  lastScanAt: Date | null;
}> {
  const snap = await getDoc(doc(getDb(), 'businesses', businessId, 'statistics', 'scans'));
  if (!snap.exists()) return { customers: 0, scans: 0, lastScanAt: null };
  const data = snap.data();
  return {
    customers: typeof data.uniqueCustomers === 'number' ? data.uniqueCustomers : 0,
    scans: typeof data.totalScans === 'number' ? data.totalScans : 0,
    lastScanAt: toDate(data.lastScanAt),
  };
}

async function loadDailyAnalytics(businessId: string): Promise<Record<string, unknown> | undefined> {
  const snap = await getDoc(doc(getDb(), 'businesses', businessId, 'analytics', 'daily'));
  if (!snap.exists()) return undefined;
  return snap.data() as Record<string, unknown>;
}

export async function loadAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [businessesSnap, usersSnap] = await Promise.all([
    getDocs(collection(getDb(), 'businesses')),
    getDocs(collection(getDb(), 'users')),
  ]);

  const usersById = new Map<string, Record<string, unknown>>();
  for (const userDoc of usersSnap.docs) {
    usersById.set(userDoc.id, userDoc.data() as Record<string, unknown>);
  }

  const now = new Date();
  const startLast7 = daysAgo(7, now);
  const startPrior7 = daysAgo(14, now);
  const staleBefore = daysAgo(STALE_DAYS, now);

  const businesses: AdminBusinessRow[] = [];

  let onTrial = 0;
  let paidActive = 0;
  let trialExpiringSoon = 0;
  let inactiveOrCancelled = 0;
  let totalCustomers = 0;
  let totalScans = 0;
  let catalogMrrUsd = 0;
  let storedLifetimePaidCents = 0;
  let trialsStarted = 0;
  let trialsConverted = 0;
  let trialsExpiredUnpaid = 0;
  let cancelledSubscriptions = 0;
  let staleVenues = 0;
  let staleOwners = 0;
  let scansLast7d = 0;
  let scansPrior7d = 0;

  for (const userData of usersById.values()) {
    if (typeof userData.lifetimePaidCents === 'number') {
      storedLifetimePaidCents += userData.lifetimePaidCents;
    }
  }

  for (const businessDoc of businessesSnap.docs) {
    const data = businessDoc.data() as Record<string, unknown>;
    if (!isRealBusiness(data)) continue;

    const ownerId = String(data.ownerId || businessDoc.id);
    const ownerData = usersById.get(ownerId);
    const owner = ownerFromUser(ownerId, ownerData);

    const plan = String(data.plan || ownerData?.plan || 'basic');
    const planStatus = typeof data.planStatus === 'string' ? data.planStatus : String(ownerData?.planStatus || '');
    const subscriptionStatus = String(data.subscriptionStatus || '');
    const isActive = data.isActive !== false;
    const trialEndsAt = toDate(data.trialEndsAt);
    const trialStartedAt = toDate(data.trialStartedAt);
    const stats = await loadBusinessStats(businessDoc.id);
    const daily = await loadDailyAnalytics(businessDoc.id);
    const last7 = sumDailyScans(daily, startLast7, now);
    const prior7 = sumDailyScans(daily, startPrior7, startLast7);

    const hasStripeSub = Boolean(owner.stripeSubscriptionId);
    const isPayingStripe =
      planStatus === 'active' && (hasStripeSub || owner.subscribed === true);

    if (trialEndsAt || trialStartedAt || planStatus === 'trial') {
      trialsStarted += 1;
    }

    if (planStatus === 'trial' && !isTrialExpired(trialEndsAt, now)) {
      onTrial += 1;
      if (remainingTrialDays(trialEndsAt, now) <= 3) {
        trialExpiringSoon += 1;
      }
    } else if (planStatus === 'active') {
      paidActive += 1;
      if (trialEndsAt || trialStartedAt) {
        trialsConverted += 1;
      }
    }

    if (
      (planStatus === 'trial' && isTrialExpired(trialEndsAt, now)) ||
      (trialEndsAt &&
        isTrialExpired(trialEndsAt, now) &&
        planStatus !== 'active' &&
        !owner.subscribed)
    ) {
      trialsExpiredUnpaid += 1;
    }

    const isCancelled =
      planStatus === 'cancelled' ||
      subscriptionStatus === 'cancelled' ||
      (owner.planStatus === 'cancelled' && !isActive);

    if (isCancelled) {
      cancelledSubscriptions += 1;
    }

    if (!isActive || planStatus === 'cancelled') {
      inactiveOrCancelled += 1;
    }

    const isStaleVenue =
      stats.customers === 0 ||
      !stats.lastScanAt ||
      stats.lastScanAt.getTime() < staleBefore.getTime();
    if (isStaleVenue && isActive && planStatus !== 'cancelled') {
      staleVenues += 1;
    }

    const ownerActivity = owner.lastSeenAt || owner.lastLoginAt;
    if (!ownerActivity || ownerActivity.getTime() < staleBefore.getTime()) {
      staleOwners += 1;
    }

    if (isPayingStripe) {
      catalogMrrUsd += catalogPrice(plan);
    }

    totalCustomers += stats.customers;
    totalScans += stats.scans;
    scansLast7d += last7;
    scansPrior7d += prior7;

    businesses.push({
      id: businessDoc.id,
      name: String(data.name || 'Unnamed'),
      email: String(data.email || owner.email || ''),
      plan,
      planStatus: planStatus || 'unknown',
      subscriptionStatus: subscriptionStatus || planStatus || 'unknown',
      isActive,
      customerCount: stats.customers,
      totalScans: stats.scans,
      lastScanAt: stats.lastScanAt,
      scansLast7d: last7,
      scansPrior7d: prior7,
      trialEndsAt,
      createdAt: toDate(data.createdAt),
      ownerId,
      owner,
      catalogMonthlyUsd: isPayingStripe ? catalogPrice(plan) : 0,
      isPayingStripe,
    });
  }

  businesses.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const payingBusinesses = businesses.filter((b) => b.isPayingStripe);
  let bannedUsers = 0;
  for (const userData of usersById.values()) {
    if (userData.banned === true) bannedUsers += 1;
  }

  return {
    businessesSignedUp: businesses.length,
    onTrial,
    paidActive,
    trialExpiringSoon,
    inactiveOrCancelled,
    totalCustomers,
    totalScans,
    bannedUsers,
    totalUsers: usersSnap.size,
    catalogMrrUsd,
    storedLifetimePaidCents,
    trialsStarted,
    trialsConverted,
    trialsExpiredUnpaid,
    cancelledSubscriptions,
    staleVenues,
    staleOwners,
    scansLast7d,
    scansPrior7d,
    payingBusinesses,
    businesses,
  };
}

export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const [usersSnap, businessesSnap] = await Promise.all([
    getDocs(collection(getDb(), 'users')),
    getDocs(collection(getDb(), 'businesses')),
  ]);

  const businessOwnerIds = new Set(
    businessesSnap.docs
      .filter((d) => isRealBusiness(d.data() as Record<string, unknown>))
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return String(data.ownerId || d.id);
      })
  );

  const users: AdminUserRow[] = usersSnap.docs.map((userDoc) => {
    const data = userDoc.data();
    return {
      id: userDoc.id,
      name: String(data.name || ''),
      email: String(data.email || ''),
      banned: data.banned === true,
      planStatus: String(data.planStatus || ''),
      subscribed: data.subscribed === true,
      hasBusiness: businessOwnerIds.has(userDoc.id),
      createdAt: toDate(data.createdAt),
      lastLoginAt: toDate(data.lastLoginAt),
    };
  });

  users.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return users;
}

export async function loadAdminBusinessDetail(businessId: string): Promise<AdminBusinessRow | null> {
  const businessSnap = await getDoc(doc(getDb(), 'businesses', businessId));
  if (!businessSnap.exists()) return null;

  const data = businessSnap.data() as Record<string, unknown>;
  if (!isRealBusiness(data)) return null;

  const ownerId = String(data.ownerId || businessSnap.id);
  const ownerSnap = await getDoc(doc(getDb(), 'users', ownerId));
  const ownerData = ownerSnap.exists() ? (ownerSnap.data() as Record<string, unknown>) : undefined;
  const owner = ownerFromUser(ownerId, ownerData);

  const plan = String(data.plan || ownerData?.plan || 'basic');
  const planStatus = String(data.planStatus || ownerData?.planStatus || 'unknown');
  const stats = await loadBusinessStats(businessId);
  const daily = await loadDailyAnalytics(businessId);
  const now = new Date();
  const last7 = sumDailyScans(daily, daysAgo(7, now), now);
  const prior7 = sumDailyScans(daily, daysAgo(14, now), daysAgo(7, now));
  const isPayingStripe =
    planStatus === 'active' && (Boolean(owner.stripeSubscriptionId) || owner.subscribed);

  return {
    id: businessSnap.id,
    name: String(data.name || 'Unnamed'),
    email: String(data.email || owner.email || ''),
    plan,
    planStatus,
    subscriptionStatus: String(data.subscriptionStatus || planStatus),
    isActive: data.isActive !== false,
    customerCount: stats.customers,
    totalScans: stats.scans,
    lastScanAt: stats.lastScanAt,
    scansLast7d: last7,
    scansPrior7d: prior7,
    trialEndsAt: toDate(data.trialEndsAt),
    createdAt: toDate(data.createdAt),
    ownerId,
    owner,
    catalogMonthlyUsd: isPayingStripe ? catalogPrice(plan) : 0,
    isPayingStripe,
  };
}
