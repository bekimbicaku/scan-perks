import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function PaymentSuccessPage() {
  useEffect(() => {
    // Send message to parent window about successful payment
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'stripe-checkout-completed',
        paymentId: 'stripe_' + Math.random().toString(36).substr(2, 9)
      }, '*');
      // Close this window
      window.close();
    } else {
      // If no opener, redirect to home after 3 seconds
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 3000);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Successful!</Text>
      <Text style={styles.subtitle}>Redirecting you back...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
});