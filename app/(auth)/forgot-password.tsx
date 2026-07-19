import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { sendPasswordResetEmail, auth } from '@/lib/firebase';
import { Mail, ArrowLeft, Send } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    const continueUrl =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : 'https://app.scan-perks.com/login';

    try {
      try {
        await sendPasswordResetEmail(auth, trimmed, {
          url: continueUrl,
          handleCodeInApp: false,
        });
      } catch (firstError: any) {
        if (
          firstError?.code === 'auth/unauthorized-continue-uri' ||
          firstError?.code === 'auth/invalid-continue-uri'
        ) {
          await sendPasswordResetEmail(auth, trimmed);
        } else {
          throw firstError;
        }
      }
      setSuccess(true);
    } catch (err: any) {
      console.error('[forgot-password]', err?.code, err?.message);
      const code = err?.code || '';

      if (code === 'auth/invalid-email') {
        setError('That email address looks invalid.');
      } else if (code === 'auth/user-not-found') {
        setSuccess(true);
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and try again.');
      } else if (
        code === 'auth/internal-error' ||
        (typeof err?.message === 'string' && /smtp|mail|send/i.test(err.message))
      ) {
        setError(
          'Email server rejected the send. In Firebase → Authentication → Templates → SMTP: use the same Gmail address as Sender, and a Google App Password (not your normal password).'
        );
      } else {
        setError(
          err?.message
            ? `Could not send reset email (${code || 'error'}). ${err.message}`
            : 'Could not send reset email. Check Firebase SMTP settings.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successContainer}>
            <Send size={48} color="#16a34a" style={styles.successIcon} />
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>We've sent password reset instructions to:</Text>
            <Text style={styles.emailText}>{email}</Text>
            <View style={styles.spamBox}>
              <Text style={styles.spamTitle}>Often lands in Spam / Junk</Text>
              <Text style={styles.instructionsText}>
                Open Spam/Junk and look for a message from Firebase / noreply@…. Mark it as Not
                spam, then tap the reset link. Also check Promotions if you use Gmail.
              </Text>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')}>
              <ArrowLeft size={20} color="#0891b2" />
              <Text style={styles.backButtonText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#64748b" />
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password. The
            email may arrive in Spam until you mark it as safe.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              underlineColorAndroid="transparent"
              keyboardAppearance="light"
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </Text>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backLinkText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0C4A6E',
    paddingVertical: 4,
  },
  button: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  spamBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    width: '100%',
  },
  spamTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#0891b2',
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0891b2',
  },
});
