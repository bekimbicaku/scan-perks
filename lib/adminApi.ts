import { auth } from '@/lib/firebase';

const ADMIN_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/platformAdmin';

type AdminAction = 'ban' | 'unban' | 'delete' | 'revenue';

export type AdminActionResult = {
  ok: boolean;
  action: AdminAction;
  userId?: string;
  authDisabled?: boolean;
  authDeleted?: boolean;
  firestoreDeleted?: boolean;
  businessDeactivated?: boolean;
  deleted?: {
    scans: number;
    rewards: number;
    pendingStamps: number;
  };
  error?: string;
};

export type AdminStripeRevenue = {
  ok: boolean;
  action: 'revenue';
  currency: string;
  mrrCents: number;
  mrrUsd: number;
  activeSubscriptions: number;
  allTimePaidCents: number;
  allTimePaidUsd: number;
  invoicesScanned: number;
  source: 'stripe';
  error?: string;
};

async function getAdminIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in as a platform admin.');
  }
  return user.getIdToken();
}

async function callAdminApi(body: Record<string, unknown>): Promise<AdminActionResult> {
  const idToken = await getAdminIdToken();
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as AdminActionResult | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Admin request failed (${response.status})`);
  }

  if (!payload?.ok) {
    throw new Error(payload?.error || 'Admin request failed');
  }

  return payload;
}

export function banUserAsAdmin(userId: string): Promise<AdminActionResult> {
  return callAdminApi({ action: 'ban', userId });
}

export function unbanUserAsAdmin(userId: string): Promise<AdminActionResult> {
  return callAdminApi({ action: 'unban', userId });
}

export function deleteUserAsAdmin(userId: string): Promise<AdminActionResult> {
  return callAdminApi({ action: 'delete', userId });
}

/** Live Stripe totals (MRR + paid invoices). Requires deployed platformAdmin revenue action. */
export async function fetchAdminStripeRevenue(): Promise<AdminStripeRevenue> {
  const idToken = await getAdminIdToken();
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ action: 'revenue' }),
  });

  const payload = (await response.json().catch(() => null)) as AdminStripeRevenue | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Stripe revenue request failed (${response.status})`);
  }
  return payload;
}
