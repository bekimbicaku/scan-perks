import { Redirect } from 'expo-router';
import AppSplash from '@/components/AppSplash';
import { useAuthGate } from '@/hooks/useAuthGate';

export default function Index() {
  const authGate = useAuthGate();

  if (authGate.status === 'loading') {
    return <AppSplash />;
  }

  if (authGate.status === 'signedIn') {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
