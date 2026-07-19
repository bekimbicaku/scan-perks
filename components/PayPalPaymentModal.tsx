import { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { CreditCard, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(getDb(), 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.subscribed && data.planStatus === 'active') {
          const paymentId =
            data.stripeSubscriptionId || 'stripe_' + Math.random().toString(36).substr(2, 9);
          handlePaymentSuccess(paymentId);
        }
      }
    });

    return () => unsubscribe();
  }, [visible]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'stripe-checkout-completed') {
          const paymentId =
            event.data.paymentId || 'stripe_' + Math.random().toString(36).substr(2, 9);
          handlePaymentSuccess(paymentId);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentInitiated(false);
    setLoading(false);
    setError(null);
    onSuccess(paymentId);
    onClose();
  };

  const handlePayment = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);
    try {
      const planType = planFromDisplayName(plan) || planFromAmount(amount);
      await openStripeCheckout({
        plan: planType,
        amount,
        planName: plan,
      });
      setPaymentInitiated(true);

      if (Platform.OS !== 'web') {
        const subscription = Linking.addEventListener('url', ({ url }) => {
          if (url.includes('payment-success')) {
            const paymentId = 'stripe_' + Math.random().toString(36).substr(2, 9);
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={loading || paymentInitiated}
          >
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
              <Text style={styles.processingText}>Payment in Progress</Text>
              <Text style={styles.processingSubtext}>
                Please complete the payment in Stripe. Once completed, your plan will activate
                automatically.
              </Text>
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
  processingSubtext: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
});
