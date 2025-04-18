import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, AlertTriangle } from 'lucide-react-native';
import { useState, useEffect } from 'react';

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
  const [canCancel, setCanCancel] = useState(false);
  const [daysUntilRenewal, setDaysUntilRenewal] = useState(0);

  useEffect(() => {
    // Calculate if within first 10 days of the month
    const today = new Date();
    const dayOfMonth = today.getDate();
    setCanCancel(dayOfMonth <= 10);

    // Calculate days until next renewal
    const nextRenewal = new Date(planStartDate);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    const timeDiff = nextRenewal.getTime() - today.getTime();
    setDaysUntilRenewal(Math.ceil(timeDiff / (1000 * 3600 * 24)));
  }, [planStartDate]);

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

          {!canCancel && (
            <View style={styles.warningBox}>
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Subscription can only be cancelled during the first 10 days of each billing cycle.
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.cancelButton, !canCancel && styles.cancelButtonDisabled]}
            disabled={!canCancel}
          >
            <Text style={[styles.cancelButtonText, !canCancel && styles.cancelButtonTextDisabled]}>
              Cancel Subscription
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Note: Cancellation will take effect at the end of your current billing period.
            You'll continue to have access to all features until then.
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  cancelButtonTextDisabled: {
    color: '#64748b',
  },
  note: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});