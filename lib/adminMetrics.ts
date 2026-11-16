import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { isTrialExpired, remainingTrialDays, toDate } from '@/lib/trial';

export type AdminBusinessRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  planStatus: string;
  isActive: boolean;
  customerCount: number;
  totalScans: number;
  trialEndsAt: Date | null;
  createdAt: Date | null;
  ownerId: string;
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
  businesses: AdminBusinessRow[];
};

function isRealBusiness(data: Record<string, unknown>): boolean {
  return Boolean(data.name && data.ownerId);
}

async function loadBusinessStats(businessId: string): Promise<{ customers: number; scans: number }> {
  const snap = await getDoc(doc(getDb(), 'businesses', businessId, 'statistics', 'scans'));
  if (!snap.exists()) return { customers: 0, scans: 0 };
  const data = snap.data();
  return {
    customers: typeof data.uniqueCustomers === 'number' ? data.uniqueCustomers : 0,
    scans: typeof data.totalScans === 'number' ? data.totalScans : 0,
  };
}

export async function loadAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const businessesSnap = await getDocs(collection(getDb(), 'businesses'));
  const now = new Date();
  const businesses: AdminBusinessRow[] = [];

  let onTrial = 0;
  let paidActive = 0;
  let trialExpiringSoon = 0;
  let inactiveOrCancelled = 0;
  let totalCustomers = 0;
  let totalScans = 0;

  for (const businessDoc of businessesSnap.docs) {
    const data = businessDoc.data() as Record<string, unknown>;
    if (!isRealBusiness(data)) continue;

    const planStatus = typeof data.planStatus === 'string' ? data.planStatus : '';
    const isActive = data.isActive !== false;
    const trialEndsAt = toDate(data.trialEndsAt);
    const stats = await loadBusinessStats(businessDoc.id);

    if (planStatus === 'trial' && !isTrialExpired(trialEndsAt, now)) {
      onTrial += 1;
      if (remainingTrialDays(trialEndsAt, now) <= 3) {
        trialExpiringSoon += 1;
      }
    } else if (planStatus === 'active') {
      paidActive += 1;
    }

    if (!isActive || planStatus === 'cancelled') {
      inactiveOrCancelled += 1;
    }

    totalCustomers += stats.customers;
    totalScans += stats.scans;

    businesses.push({
      id: businessDoc.id,
      name: String(data.name || 'Unnamed'),
      email: String(data.email || ''),
      plan: String(data.plan || 'basic'),
      planStatus: planStatus || 'unknown',
      isActive,
      customerCount: stats.customers,
      totalScans: stats.scans,
      trialEndsAt,
      createdAt: toDate(data.createdAt),
      ownerId: String(data.ownerId || businessDoc.id),
    });
  }

  businesses.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  let bannedUsers = 0;
  let totalUsers = 0;
  try {
    const usersSnap = await getDocs(collection(getDb(), 'users'));
    totalUsers = usersSnap.size;
    bannedUsers = usersSnap.docs.filter((d) => d.data().banned === true).length;
  } catch (error) {
    console.warn('[admin] could not load user counts', error);
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
    totalUsers,
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
      .map((d) => d.id)
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

  const stats = await loadBusinessStats(businessId);
  return {
    id: businessSnap.id,
    name: String(data.name || 'Unnamed'),
    email: String(data.email || ''),
    plan: String(data.plan || 'basic'),
    planStatus: String(data.planStatus || 'unknown'),
    isActive: data.isActive !== false,
    customerCount: stats.customers,
    totalScans: stats.scans,
    trialEndsAt: toDate(data.trialEndsAt),
    createdAt: toDate(data.createdAt),
    ownerId: String(data.ownerId || businessSnap.id),
  };
}
