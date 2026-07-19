import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { CreditCard, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/lib/firebase';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { openStripeCheckout } from '@/lib/stripeCheckout';
import { planFromAmount, planFromDisplayName } from '@/lib/stripeProducts';

interface PayPalPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  amount: number;
  plan: string;
}

export default function PayPalPaymentModal({
  visible,
  onClose,
  onSuccess,
  amount,
  plan,
}: PayPalPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successHandled = useRef(false);

  const handlePaymentSuccess = useCallback(
    (paymentId: string) => {
      if (successHandled.current) return;
      successHandled.current = true;
      setPaymentInitiated(false);
      setLoading(false);
      setChecking(false);
      setError(null);
      onSuccess(paymentId);
      onClose();
    },
    [onClose, onSuccess]
  );

  const checkSubscriptionActive = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return false;

    setChecking(true);
    try {
      const snap = await getDoc(doc(getDb(), 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.subscribed && data.planStatus === 'active') {
          const paymentId =
            data.stripeSubscriptionId ||
            data.stripeCheckoutSessionId ||
            'stripe_' + Math.random().toString(36).slice(2, 11);
          handlePaymentSuccess(paymentId);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('[payment] check subscription failed', err);
      return false;
    } finally {
      setChecking(false);
    }
  }, [handlePaymentSuccess]);

  useEffect(() => {
    if (!visible) {
      successHandled.current = false;
      setPaymentInitiated(false);
      setLoading(false);
      setError(null);
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(getDb(), 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.subscribed && data.planStatus === 'active') {
        const paymentId =
          data.stripeSubscriptionId ||
          data.stripeCheckoutSessionId ||
          'stripe_' + Math.random().toString(36).slice(2, 11);
        handlePaymentSuccess(paymentId);
      }
    });

    return () => unsubscribe();
  }, [visible, handlePaymentSuccess]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'stripe-checkout-completed') {
        const paymentId =
          event.data.paymentId || 'stripe_' + Math.random().toString(36).slice(2, 11);
        handlePaymentSuccess(paymentId);
      }
      if (event.data?.type === 'stripe-checkout-cancelled') {
        setPaymentInitiated(false);
        setLoading(false);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && paymentInitiated) {
        void checkSubscriptionActive();
      }
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [paymentInitiated, handlePaymentSuccess, checkSubscriptionActive]);

  const handlePayment = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);
    successHandled.current = false;

    try {
      const planType = planFromDisplayName(plan) || planFromAmount(amount);
      await openStripeCheckout({
        plan: planType,
        amount,
        planName: plan,
      });
      // On web, location.assign navigates away. If we somehow stay (or user hits Back):
      setPaymentInitiated(true);
      setLoading(false);

      if (Platform.OS !== 'web') {
        const subscription = Linking.addEventListener('url', ({ url }) => {
          if (url.includes('payment-success')) {
            const paymentId = 'stripe_' + Math.random().toString(36).slice(2, 11);
            handlePaymentSuccess(paymentId);
            subscription.remove();
          } else if (url.includes('payment-cancelled')) {
            setPaymentInitiated(false);
            setLoading(false);
            subscription.remove();
          }
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setPaymentInitiated(false);
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Payment</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.planSummary}>
            <Text style={styles.planName}>{plan}</Text>
            <Text style={styles.planPrice}>${amount}/month</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {paymentInitiated ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator color="#0891b2" style={{ marginBottom: 12 }} />
              <Text style={styles.processingText}>Payment in Progress</Text>
              <Text style={styles.processingSubtext}>
                Complete checkout in Stripe. When you return, we verify the payment and activate
                your plan automatically.
              </Text>
              <TouchableOpacity
                style={[styles.checkButton, checking && styles.paymentButtonDisabled]}
                onPress={() => void checkSubscriptionActive()}
                disabled={checking}
              >
                <Text style={styles.checkButtonText}>
                  {checking ? 'Checking...' : "I've completed payment — check now"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
                onPress={handlePayment}
                disabled={loading}
              >
                <CreditCard size={24} color="#fff" />
                <Text style={styles.paymentButtonText}>
                  {loading ? 'Opening Stripe...' : 'Pay with Stripe'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.securePayment}>
            <Text style={styles.secureText}>Secure payment powered by Stripe</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeButton: { padding: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  content: { padding: 20, flex: 1 },
  planSummary: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  planName: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  planPrice: { fontSize: 32, fontWeight: 'bold', color: '#0891b2' },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  paymentMethods: { gap: 16 },
  paymentButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentButtonDisabled: { opacity: 0.7 },
  paymentButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  securePayment: { marginTop: 24, alignItems: 'center' },
  secureText: { fontSize: 14, color: '#64748b' },
  processingContainer: {
    backgroundColor: '#f0fdfa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  processingText: { fontSize: 18, fontWeight: 'bold', color: '#0891b2', marginBottom: 8 },
  processingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
