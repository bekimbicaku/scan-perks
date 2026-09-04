import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AppSplash from '@/components/AppSplash';
import { useAuthGate } from '@/hooks/useAuthGate';
import { getPendingReferralCode, hasSeenWelcome } from '@/lib/onboarding';

type Dest = 'loading' | 'home' | 'welcome' | 'login' | 'register';

export default function Index() {
  const authGate = useAuthGate();
  const [dest, setDest] = useState<Dest>('loading');

  useEffect(() => {
    if (authGate.status === 'loading') {
      setDest('loading');
      return;
    }

    if (authGate.status === 'signedIn') {
      setDest('home');
      return;
    }

    let cancelled = false;
    (async () => {
      const [seenWelcome, pendingRef] = await Promise.all([hasSeenWelcome(), getPendingReferralCode()]);
      if (cancelled) return;
      if (pendingRef) {
        setDest('register');
        return;
      }
      setDest(seenWelcome ? 'login' : 'welcome');
    })();

    return () => {
      cancelled = true;
    };
  }, [authGate.status]);

  if (dest === 'loading') {
    return <AppSplash />;
  }

  if (dest === 'home') {
    return <Redirect href="/home" />;
  }

  if (dest === 'welcome') {
    return <Redirect href="/welcome" />;
  }

  if (dest === 'register') {
    return <Redirect href="/register" />;
  }

  return <Redirect href="/login" />;
}
