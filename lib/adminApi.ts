import { auth } from '@/lib/firebase';

const ADMIN_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/platformAdmin';

type AdminAction =
  | 'ban'
  | 'unban'
  | 'delete'
  | 'revenue'
  | 'setPriceOverride'
  | 'sendPromo';

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

export type AdminPriceOverrideResult = {
  ok: boolean;
  action: 'setPriceOverride';
  businessId: string;
  ownerId: string;
  amountUsd: number;
  months: number;
  /** keep = stays until changed again; revert_after_months = Stripe schedule reverts after N cycles */
  periodEndBehavior: 'keep' | 'revert_after_months';
  originalPriceId: string;
  overridePriceId: string;
  scheduleId: string | null;
  stripeSubscriptionId: string;
  error?: string;
};

export type AdminPromoResult = {
  ok: boolean;
  action: 'sendPromo';
  logId: string;
  targetsMatched: number;
  targetsAttempted: number;
  pushSent: number;
  pushFailed: number;
  emailSent: number;
  emailFailed: number;
  truncated: boolean;
  error?: string;
};

async function getAdminIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in as a platform admin.');
  }
  return user.getIdToken();
}

async function postAdmin<T extends { ok?: boolean; error?: string }>(
  body: Record<string, unknown>
): Promise<T> {
  const idToken = await getAdminIdToken();
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Admin request failed (${response.status})`);
  }
  return payload;
}

async function callAdminApi(body: Record<string, unknown>): Promise<AdminActionResult> {
  return postAdmin<AdminActionResult>(body);
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
export function fetchAdminStripeRevenue(): Promise<AdminStripeRevenue> {
  return postAdmin<AdminStripeRevenue>({ action: 'revenue' });
}

/**
 * Override a venue owner's Stripe subscription price.
 * months=0 → keep until changed again; months>=1 → revert to original price after N billing cycles.
 */
export function setBusinessPriceOverride(input: {
  businessId: string;
  amountUsd: number;
  months: number;
}): Promise<AdminPriceOverrideResult> {
  return postAdmin<AdminPriceOverrideResult>({
    action: 'setPriceOverride',
    confirm: true,
    businessId: input.businessId,
    amountUsd: input.amountUsd,
    months: input.months,
  });
}

/** Send promotional push (Expo) and/or email (Resend) to matched users. */
export function sendAdminPromo(input: {
  title: string;
  body: string;
  channels: Array<'push' | 'email'>;
  audience: 'all' | 'owners' | 'customers';
  businessId?: string;
}): Promise<AdminPromoResult> {
  return postAdmin<AdminPromoResult>({
    action: 'sendPromo',
    confirm: true,
    title: input.title,
    body: input.body,
    channels: input.channels,
    audience: input.audience,
    businessId: input.businessId || undefined,
  });
}
