import { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { CreditCard, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PayPalPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  amount: number;
  plan: string;
}

const STRIPE_PAYMENT_LINKS = {
  basic: 'https://buy.stripe.com/test_dR6eXddT75D13Ha6op',
  premium: 'https://buy.stripe.com/test_5kA9CT6qF7L97Xq000',
};

export default function PayPalPaymentModal({
  visible,
  onClose,
  onSuccess,
  amount,
  plan,
}: PayPalPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for changes in the user document
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Check if subscription is active and payment was successful
        if (data.subscribed && data.planStatus === 'active') {
          const paymentId = data.stripeSubscriptionId || 'stripe_' + Math.random().toString(36).substr(2, 9);
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
          const paymentId = event.data.paymentId || 'stripe_' + Math.random().toString(36).substr(2, 9);
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
    onSuccess(paymentId);
    onClose();
  };

  const handlePayment = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const planType = amount === 10 ? 'basic' : 'premium';
      const paymentLink = STRIPE_PAYMENT_LINKS[planType];
      
      if (Platform.OS === 'web') {
        const successUrl = encodeURIComponent(`${window.location.origin}/payment-success`);
        const cancelUrl = encodeURIComponent(`${window.location.origin}/payment-cancelled`);
        const fullPaymentLink = `${paymentLink}?client_reference_id=${auth.currentUser.uid}&success_url=${successUrl}&cancel_url=${cancelUrl}`;
        
        const stripeWindow = window.open(fullPaymentLink, '_blank');
        if (stripeWindow) {
          setPaymentInitiated(true);
        }
      } else {
        const returnUrl = encodeURIComponent(`scanperks://payment-success`);
        const cancelUrl = encodeURIComponent(`scanperks://payment-cancelled`);
        const fullPaymentLink = `${paymentLink}?client_reference_id=${auth.currentUser.uid}&success_url=${returnUrl}&cancel_url=${cancelUrl}`;
        
        await Linking.openURL(fullPaymentLink);
        setPaymentInitiated(true);

        // Set up URL listener for mobile
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
    } catch (error) {
      console.error('Payment error:', error);
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

          {paymentInitiated ? (
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>
                Payment in Progress
              </Text>
              <Text style={styles.processingSubtext}>
                Please complete the payment in your browser.
                Once completed, you'll be automatically redirected.
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
                  {loading ? 'Processing...' : 'Pay with Stripe'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.securePayment}>
            <Text style={styles.secureText}>
              🔒 Secure payment powered by Stripe
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  planSummary: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0891b2',
  },
  paymentMethods: {
    gap: 16,
  },
  paymentButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentButtonDisabled: {
    opacity: 0.7,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securePayment: {
    marginTop: 24,
    alignItems: 'center',
  },
  secureText: {
    fontSize: 14,
    color: '#64748b',
  },
  processingContainer: {
    backgroundColor: '#f0fdfa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});