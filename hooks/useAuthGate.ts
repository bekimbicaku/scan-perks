import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ensureFirebaseServices, getAuthInstance } from '@/lib/firebase';
import { isFirebaseConfigured } from '@/lib/firebaseConfig';

type AuthGateState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

const AUTH_TIMEOUT_MS = 2500;

/**
 * Resolves Firebase auth for routing. Never stays on loading longer than AUTH_TIMEOUT_MS.
 */
export function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (next: AuthGateState) => {
      if (!alive || settled) return;
      settled = true;
      clearTimeout(timeout);
      setState(next);
      unsubscribe?.();
      unsubscribe = undefined;
    };

    const timeout = setTimeout(() => {
      console.warn('[auth] auth gate timed out — showing login');
      finish({ status: 'signedOut' });
    }, AUTH_TIMEOUT_MS);

    try {
      ensureFirebaseServices();

      if (!isFirebaseConfigured()) {
        finish({ status: 'signedOut' });
      } else {
        const authInstance = getAuthInstance();

        if (authInstance.currentUser) {
          finish({ status: 'signedIn', user: authInstance.currentUser });
        } else {
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
        }
      }
    } catch (error) {
      console.warn('[auth] failed to start auth gate', error);
      finish({ status: 'signedOut' });
    }

    return () => {
      alive = false;
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  return state;
}
