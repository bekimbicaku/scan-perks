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
const CHECKOUT_CLOUD_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/createCheckoutSession';

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

function buildPaymentLinkUrl(plan: StripePlanType, userId: string): string {
  const base = getStripePaymentLink(plan);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}client_reference_id=${encodeURIComponent(userId)}`;
}

/**
 * Prefer live Payment Links (fast, no server required).
 * Optionally try Checkout Session API when available.
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

  // Primary: Payment Links you configured in Stripe Dashboard
  const paymentLinkUrl = buildPaymentLinkUrl(plan, user.uid);

  // Optional enhancement: Checkout Session (if Cloud Function / local API is up)
  try {
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
      } catch {
        // fall through to payment link
      }
    }
  } catch {
    // fall through to payment link
  }

  return paymentLinkUrl;
}

export async function openStripeCheckout(input: {
  plan?: StripePlanType;
  amount?: number;
  planName?: string;
}): Promise<void> {
  const url = await createStripeCheckoutUrl(input);

  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    showInRecents: true,
    enableBarCollapsing: true,
  });
}
