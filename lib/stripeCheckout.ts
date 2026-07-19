import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '@/lib/firebase';
import {
  planFromAmount,
  planFromDisplayName,
  type StripePlanType,
} from '@/lib/stripeProducts';
import { getStripePaymentLink } from '@/lib/stripePaymentLinks';

const CHECKOUT_API_PATH = '/api/create-checkout-session';
const VERIFY_API_PATH = '/api/verify-checkout-session';
const CHECKOUT_CLOUD_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/createCheckoutSession';
const VERIFY_CLOUD_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/verifyCheckoutSession';

function getCheckoutEndpoints(): string[] {
  const endpoints: string[] = [];
  const isLocalDev =
    __DEV__ ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (isLocalDev) {
    endpoints.push(CHECKOUT_API_PATH);
  }

  endpoints.push(CHECKOUT_CLOUD_FUNCTION_URL);
  return [...new Set(endpoints)];
}

function getVerifyEndpoints(): string[] {
  const endpoints: string[] = [VERIFY_CLOUD_FUNCTION_URL];
  const isLocalDev =
    __DEV__ ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (isLocalDev) {
    endpoints.unshift(VERIFY_API_PATH);
  }

  return [...new Set(endpoints)];
}

function buildPaymentLinkUrl(plan: StripePlanType, userId: string): string {
  const base = getStripePaymentLink(plan);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}client_reference_id=${encodeURIComponent(userId)}`;
}

/**
 * Prefer Checkout Session (returns session_id on success URL for verification).
 * Payment Links are last-resort fallback only.
 */
export async function createStripeCheckoutUrl(input: {
  plan?: StripePlanType;
  amount?: number;
  planName?: string;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to subscribe.');
  }

  const plan: StripePlanType =
    input.plan ||
    (input.planName ? planFromDisplayName(input.planName) : undefined) ||
    (typeof input.amount === 'number' ? planFromAmount(input.amount) : 'basic');

  const idToken = await user.getIdToken();
  const payload = {
    plan,
    userId: user.uid,
    email: user.email,
    successUrl:
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/payment-success`
        : 'https://app.scan-perks.com/payment-success',
    cancelUrl:
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/payment-cancelled`
        : 'https://app.scan-perks.com/payment-cancelled',
  };

  let lastError = 'Could not start Stripe checkout.';

  for (const endpoint of getCheckoutEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.url && typeof data.url === 'string') {
        return data.url;
      }
      lastError =
        (data && typeof data.error === 'string' && data.error) ||
        `Checkout failed (${response.status})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  // Last resort: Payment Link (webhook must activate; no session_id on return)
  console.warn('[stripe] Checkout Session unavailable, falling back to Payment Link:', lastError);
  return buildPaymentLinkUrl(plan, user.uid);
}

export async function openStripeCheckout(input: {
  plan?: StripePlanType;
  amount?: number;
  planName?: string;
}): Promise<void> {
  const url = await createStripeCheckoutUrl(input);

  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    showInRecents: true,
    enableBarCollapsing: true,
  });
}

export type VerifyCheckoutResult = {
  ok: boolean;
  plan?: StripePlanType;
  paymentId?: string;
  paymentStatus?: string;
  status?: string;
  error?: string;
};

/**
 * Confirms payment with Stripe via Cloud Function and activates the plan in Firestore.
 */
export async function verifyStripeCheckoutSession(
  sessionId: string
): Promise<VerifyCheckoutResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to verify payment.');
  }

  if (!sessionId.startsWith('cs_')) {
    throw new Error('Invalid checkout session id.');
  }

  const idToken = await user.getIdToken();
  let lastError = 'Failed to verify payment.';

  for (const endpoint of getVerifyEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        return {
          ok: Boolean(data.ok),
          plan: data.plan,
          paymentId: data.paymentId,
          paymentStatus: data.paymentStatus,
          status: data.status,
          error: typeof data.error === 'string' ? data.error : undefined,
        };
      }

      lastError =
        (data && typeof data.error === 'string' && data.error) ||
        `Verify failed (${response.status})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}
