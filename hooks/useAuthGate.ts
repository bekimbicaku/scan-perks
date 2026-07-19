import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ensureFirebaseServices, getAuthInstance } from '@/lib/firebase';
import { isFirebaseConfigured } from '@/lib/firebaseConfig';

type AuthGateState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

const AUTH_TIMEOUT_MS = 4000;

/**
 * Waits for the first Firebase auth callback so we don't flash the wrong screen
 * while IndexedDB persistence is restoring a session on web.
 */
export function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>({ status: 'loading' });

  useEffect(() => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (next: AuthGateState) => {
      if (settled) return;
      settled = true;
      setState(next);
    };

    try {
      ensureFirebaseServices();

      if (!isFirebaseConfigured()) {
        finish({ status: 'signedOut' });
        return;
      }

      // Use the real Auth instance — Firebase does not reliably subscribe through a Proxy.
      const authInstance = getAuthInstance();

      unsubscribe = onAuthStateChanged(
        authInstance,
        (user) => {
          finish(user ? { status: 'signedIn', user } : { status: 'signedOut' });
        },
        (error) => {
          console.warn('[auth] onAuthStateChanged error', error);
          finish({ status: 'signedOut' });
        }
      );
    } catch (error) {
      console.warn('[auth] failed to start auth gate', error);
      finish({ status: 'signedOut' });
    }

    const timeout = setTimeout(() => {
      console.warn('[auth] auth gate timed out — showing login');
      finish({ status: 'signedOut' });
    }, AUTH_TIMEOUT_MS);

    return () => {
      settled = true;
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  return state;
}
