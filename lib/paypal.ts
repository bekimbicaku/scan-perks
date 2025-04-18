import { Platform } from 'react-native';

const PAYPAL_CONFIG = {
  mode: 'sandbox',
  clientId: 'AVjxKsmgDU17N0OGUgZH4Y1RZKEa0j2-4Y_dO5fwV1vGq_OXITdFqImiPbvMIjdihEOiPa0qUaLljle7',
  clientSecret: 'EHLpjCgGwViA7FGf-VtuuiEIIm3ZfL7m9rtngSe2Sr2RTglnwTEuVYaSZQkz_fyJillHkumHiVjaoUAS',
};

export const initializePayPal = () => {
  if (Platform.OS === 'web') {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&currency=USD`;
    script.async = true;
    document.body.appendChild(script);
  }
};

export const processPayment = async (amount: number, plan: string) => {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      // PayPal payment flow will be handled by the PayPal button component
      resolve(true);
    });
  } else {
    // For native platforms, we'll use a WebView-based approach
    const response = await fetch('/api/create-paypal-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        plan,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Payment processing failed');
    }

    const data = await response.json();
    return data;
  }
};