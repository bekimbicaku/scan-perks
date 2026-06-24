import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';

export default function PaymentCancelledPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'stripe-checkout-cancelled'
      }, '*');
      window.close();
    }
  }, []);

  const handleTryAgain = () => {
    router.replace('/(tabs)/business');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <X size={48} color="#ef4444" />
      </View>
      <Text style={styles.title}>Payment Cancelled</Text>
      <Text style={styles.subtitle}>Your payment was not completed</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleTryAgain}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  iconContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 50,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});