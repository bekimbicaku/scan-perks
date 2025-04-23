import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Platform, Linking } from 'react-native';

interface ManageSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlan: string;
  planStartDate: Date;
}

export default function ManageSubscriptionModal({
  visible,
  onClose,
  currentPlan,
  planStartDate,
}: ManageSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysUntilRenewal, setDaysUntilRenewal] = useState(0);

  useEffect(() => {
    const nextRenewal = new Date(planStartDate);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    const timeDiff = nextRenewal.getTime() - new Date().getTime();
    setDaysUntilRenewal(Math.ceil(timeDiff / (1000 * 3600 * 24)));
  }, [planStartDate]);

  const handleCancelSubscription = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-billing-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const { url } = await response.json();

      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Failed to open billing portal. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Manage Subscription</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>{currentPlan}</Text>
            <View style={styles.renewalInfo}>
              <CreditCard size={20} color="#64748b" />
              <Text style={styles.renewalText}>
                Renews in {daysUntilRenewal} days
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <AlertTriangle size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
            onPress={handleCancelSubscription}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>
              {loading ? 'Opening Billing Portal...' : 'Manage Billing'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            You'll be redirected to Stripe's secure billing portal to manage your subscription.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  planInfo: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  renewalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renewalText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  note: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});