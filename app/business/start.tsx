import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import AppSplash from '@/components/AppSplash';
import { useAuthGate } from '@/hooks/useAuthGate';
import { intentFromParams, persistOwnerAcquisition, saveOwnerIntent } from '@/lib/businessStart';
import { markWelcomeSeen } from '@/lib/onboarding';

export default function BusinessStartScreen() {
  const params = useLocalSearchParams<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    from?: string;
    cafe?: string;
  }>();
  const authGate = useAuthGate();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (authGate.status === 'loading' || started) return;
    setStarted(true);
    let cancelled = false;

    (async () => {
      await saveOwnerIntent(intentFromParams(params));
      await markWelcomeSeen();
      if (cancelled) return;
      if (authGate.status === 'signedIn') {
        await persistOwnerAcquisition(authGate.user.uid);
        router.replace('/business');
        return;
      }
      router.replace('/register?business=1');
    })().catch((err) => {
      console.warn('[business-start]', err);
      if (!cancelled) router.replace('/register?business=1');
    });

    return () => {
      cancelled = true;
    };
  }, [authGate, params, started]);

  return <AppSplash />;
}
