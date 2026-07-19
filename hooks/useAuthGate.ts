import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, ensureFirebaseServices } from '@/lib/firebase';
import { isFirebaseConfigured } from '@/lib/firebaseConfig';

type AuthGateState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

/**
 * Waits for the first Firebase auth callback so we don't flash the wrong screen
 * while IndexedDB persistence is restoring a session on web.
 */
export function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>({ status: 'loading' });

  useEffect(() => {
    ensureFirebaseServices();

    if (!isFirebaseConfigured()) {
      setState({ status: 'signedOut' });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState(user ? { status: 'signedIn', user } : { status: 'signedOut' });
    });

    return unsubscribe;
  }, []);

  return state;
}
