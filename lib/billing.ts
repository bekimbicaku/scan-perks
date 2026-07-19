import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '@/lib/firebase';

const BILLING_API_PATH = '/api/create-billing-session';
const CLOUD_FUNCTION_URL =
  'https://europe-west1-scanperks-cc721.cloudfunctions.net/createBillingPortalSession';

function getBillingEndpoints(): string[] {
  const endpoints: string[] = [];
  const isLocalDev =
    __DEV__ ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (isLocalDev) {
    endpoints.push(BILLING_API_PATH);
  }

  endpoints.push(CLOUD_FUNCTION_URL);

  return [...new Set(endpoints)];
}

export function getBillingReturnUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/business`;
  }

  return 'https://app.scan-perks.com/business';
}

async function parseBillingError(response: Response, payload: unknown): Promise<string> {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }

  if (response.status === 401) {
    return 'Session expired. Sign out and sign in again.';
  }

  if (response.status === 404) {
    return 'Billing server not found. Restart Expo with npx expo start --clear.';
  }

  if (response.status === 400) {
    return 'No Stripe billing profile found. Subscribe with Pay with Stripe first.';
  }

  const fallback = await response.text().catch(() => '');
  if (fallback && !fallback.includes('<!DOCTYPE')) {
    return fallback.slice(0, 180);
  }

  return `Billing request failed (${response.status}).`;
}

export async function createBillingPortalSession(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to manage billing.');
  }

  const idToken = await user.getIdToken();
  const returnUrl = getBillingReturnUrl();
  const endpoints = getBillingEndpoints();
  let lastError = 'Failed to open billing portal. Please try again.';

  for (const endpoint of endpoints) {
    try {
      console.log('[billing] requesting portal session from:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ returnUrl }),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.url && typeof payload.url === 'string') {
        return payload.url;
      }

      lastError = await parseBillingError(response, payload);
      console.warn('[billing] endpoint failed:', endpoint, response.status, lastError);

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        break;
      }
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : 'Network error while opening billing portal.';
      console.warn('[billing] endpoint error:', endpoint, lastError);
    }
  }

  throw new Error(lastError);
}

export async function openBillingPortal(): Promise<void> {
  const url = await createBillingPortalSession();

  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    showInRecents: true,
    enableBarCollapsing: true,
  });
}
