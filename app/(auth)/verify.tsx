import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { auth } from '@/lib/firebase';
import { verifyEmailCode, resendVerificationCode } from '@/lib/auth';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react-native';

export default function VerifyScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/login');
        return;
      }

      await verifyEmailCode(userId, code);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    setError('');

    try {
      const userId = auth.currentUser?.uid;
      const email = auth.currentUser?.email;
      if (!userId || !email) {
        router.replace('/login');
        return;
      }

      await resendVerificationCode(userId, email);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backLink}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color="#64748b" />
        <Text style={styles.backLinkText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Shield size={48} color="#0891b2" />
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email address
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.resendButton, (loading || cooldown > 0) && styles.resendButtonDisabled]} 
          onPress={handleResend}
          disabled={loading || cooldown > 0}
        >
          <RefreshCw size={20} color={cooldown > 0 ? '#94a3b8' : '#0891b2'} />
          <Text style={[styles.resendButtonText, cooldown > 0 && styles.resendButtonTextDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  backLinkText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    padding: 20,
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendButtonText: {
    color: '#0891b2',
    fontSize: 16,
  },
  resendButtonTextDisabled: {
    color: '#94a3b8',
  },
});