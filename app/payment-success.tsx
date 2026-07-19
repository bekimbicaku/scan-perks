import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuthInstance, onAuthStateChanged } from '@/lib/firebase';
import { verifyStripeCheckoutSession } from '@/lib/stripeCheckout';

export default function PaymentSuccessPage() {
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [message, setMessage] = useState('Confirming your payment...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finishRedirect = (paymentId?: string) => {
      if (cancelled) return;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
        window.opener.postMessage(
          {
            type: 'stripe-checkout-completed',
            paymentId: paymentId || 'stripe_ok',
          },
          '*'
        );
        window.close();
        return;
      }

      router.replace('/business?upgraded=1&step=qr-type');
    };

    const run = async (uid: string) => {
      const sessionId =
        (typeof params.session_id === 'string' && params.session_id) ||
        (Platform.OS === 'web' && typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('session_id')
          : null);

      try {
        if (sessionId) {
          setMessage('Verifying payment with Stripe...');
          const result = await verifyStripeCheckoutSession(sessionId);
          if (cancelled) return;

          if (!result.ok) {
            setError(
              'Payment is still processing. If you were charged, your plan will activate shortly.'
            );
            timeout = setTimeout(() => finishRedirect(), 2500);
            return;
          }

          setMessage('Payment confirmed! Activating your plan...');
          finishRedirect(result.paymentId);
          return;
        }

        // No session_id (e.g. Payment Link) — rely on webhook; still leave this page
        setMessage('Payment received. Finishing setup...');
        timeout = setTimeout(() => finishRedirect(), 1500);
      } catch (err) {
        console.error('[payment-success]', err);
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not verify payment. If you were charged, refresh Business in a moment.'
        );
        timeout = setTimeout(() => finishRedirect(), 3000);
      }
    };

    // Wait briefly for Firebase Auth persistence on web after Stripe redirect
    try {
      const authInstance = getAuthInstance();
      if (authInstance.currentUser) {
        void run(authInstance.currentUser.uid);
      } else {
        const unsub = onAuthStateChanged(authInstance, (user) => {
          unsub();
          if (user) {
            void run(user.uid);
          } else {
            setError('Please sign in again to finish activating your plan.');
            timeout = setTimeout(() => router.replace('/login'), 2500);
          }
        });
      }
    } catch (err) {
      console.error('[payment-success] auth', err);
      setError('Could not restore your session. Please sign in again.');
      timeout = setTimeout(() => router.replace('/login'), 2500);
    }

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [params.session_id]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0891b2" style={styles.spinner} />
      <Text style={styles.title}>{error ? 'Almost there' : 'Payment Successful!'}</Text>
      <Text style={styles.subtitle}>{error || message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
