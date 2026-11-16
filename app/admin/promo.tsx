import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { sendAdminPromo } from '@/lib/adminApi';
import { stamp, outfit } from '@/theme';

type Audience = 'all' | 'owners' | 'customers';

export default function AdminPromoScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [businessId, setBusinessId] = useState('');
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const channels: Array<'push' | 'email'> = [];
  if (push) channels.push('push');
  if (email) channels.push('email');

  const openConfirm = () => {
    setError(null);
    setResult(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    if (channels.length === 0) {
      setError('Pick at least one channel');
      return;
    }
    if (audience === 'customers' && !businessId.trim()) {
      setError('Business id is required for customers audience');
      return;
    }
    setConfirmOpen(true);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await sendAdminPromo({
        title: title.trim(),
        body: body.trim(),
        channels,
        audience,
        businessId: audience === 'customers' ? businessId.trim() : undefined,
      });
      setConfirmOpen(false);
      setResult(
        `Sent. Push ${payload.pushSent} ok / ${payload.pushFailed} fail · Email ${payload.emailSent} ok / ${payload.emailFailed} fail · matched ${payload.targetsMatched}${
          payload.truncated ? ' (capped at 500)' : ''
        }`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin')}>
        <ArrowLeft size={18} color={stamp.deep} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Promo message</Text>
      <Text style={styles.hint}>
        Uses existing Expo push (`expoPushToken`) and Resend email paths. Confirm before send. Max 500
        recipients per send.
      </Text>

      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Short headline"
        placeholderTextColor={stamp.input}
        maxLength={120}
      />

      <Text style={styles.fieldLabel}>Body</Text>
      <TextInput
        style={[styles.input, styles.bodyInput]}
        value={body}
        onChangeText={setBody}
        placeholder="Message body"
        placeholderTextColor={stamp.input}
        multiline
        maxLength={2000}
      />

      <Text style={styles.fieldLabel}>Audience</Text>
      <View style={styles.row}>
        {(['all', 'owners', 'customers'] as Audience[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, audience === option && styles.chipOn]}
            onPress={() => setAudience(option)}
          >
            <Text style={[styles.chipText, audience === option && styles.chipTextOn]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {audience === 'customers' ? (
        <>
          <Text style={styles.fieldLabel}>Business id (customers who scanned)</Text>
          <TextInput
            style={styles.input}
            value={businessId}
            onChangeText={setBusinessId}
            placeholder="Firebase business / owner uid"
            placeholderTextColor={stamp.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      ) : null}

      <Text style={styles.fieldLabel}>Channels</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, push && styles.chipOn]}
          onPress={() => setPush((v) => !v)}
        >
          <Text style={[styles.chipText, push && styles.chipTextOn]}>In-app push</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, email && styles.chipOn]}
          onPress={() => setEmail((v) => !v)}
        >
          <Text style={[styles.chipText, email && styles.chipTextOn]}>Email</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.ok}>{result}</Text> : null}

      <TouchableOpacity style={styles.sendButton} onPress={openConfirm}>
        <Text style={styles.sendText}>Review & send…</Text>
      </TouchableOpacity>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !busy && setConfirmOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Confirm promo send</Text>
            <Text style={styles.modalBody}>
              Send “{title.trim()}” via {channels.join(' + ')} to audience “{audience}”
              {audience === 'customers' ? ` (business ${businessId.trim()})` : ''}.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                disabled={busy}
                onPress={() => setConfirmOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} disabled={busy} onPress={send}>
                {busy ? (
                  <ActivityIndicator color={stamp.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Send now</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: outfit.medium,
    fontSize: 14,
    color: stamp.deep,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 28,
    color: stamp.deep,
  },
  hint: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
    lineHeight: 18,
  },
  fieldLabel: {
    fontFamily: outfit.medium,
    fontSize: 13,
    color: stamp.deep,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: outfit.regular,
    fontSize: 15,
    color: stamp.deep,
    backgroundColor: stamp.white,
  },
  bodyInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: stamp.white,
  },
  chipOn: {
    backgroundColor: stamp.skyTint,
    borderColor: stamp.sky,
  },
  chipText: {
    fontFamily: outfit.medium,
    fontSize: 13,
    color: stamp.muted,
  },
  chipTextOn: {
    color: stamp.deep,
  },
  error: {
    fontFamily: outfit.medium,
    color: stamp.danger,
    fontSize: 14,
  },
  ok: {
    fontFamily: outfit.medium,
    color: stamp.mintText,
    fontSize: 14,
  },
  sendButton: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: stamp.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: outfit.semibold,
    color: stamp.white,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: stamp.white,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontFamily: outfit.bold,
    fontSize: 18,
    color: stamp.deep,
  },
  modalBody: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stamp.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: outfit.semibold,
    color: stamp.deep,
  },
  modalConfirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: stamp.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: outfit.semibold,
    color: stamp.white,
  },
});
