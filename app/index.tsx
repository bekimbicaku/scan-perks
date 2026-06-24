import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import AppSplash from '@/components/AppSplash';
import { auth } from '@/lib/firebase';
import { isFirebaseConfigured } from '@/lib/firebaseConfig';

export default function Index() {
  const [target, setTarget] = useState<'loading' | 'login' | 'tabs'>('loading');

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setTarget('login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTarget(user ? 'tabs' : 'login');
    });

    return unsubscribe;
  }, []);

  if (target === 'loading') {
    return <AppSplash />;
  }

  if (target === 'tabs') {
    return <Redirect href="/(tabs)/" />;
  }

  return <Redirect href="/login" />;
}
