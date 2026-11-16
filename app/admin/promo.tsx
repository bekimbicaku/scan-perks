import { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, Mail, Megaphone } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import {
  fetchAdminEmailStatus,
  sendAdminPromo,
  type AdminEmailStatus,
} from '@/lib/adminApi';
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
  const [emailStatus, setEmailStatus] = useState<AdminEmailStatus | null>(null);
  const [emailStatusError, setEmailStatusError] = useState<string | null>(null);

  const loadEmailStatus = useCallback(async () => {
    setEmailStatusError(null);
    try {
      setEmailStatus(await fetchAdminEmailStatus());
    } catch (err) {
      setEmailStatus(null);
      setEmailStatusError(err instanceof Error ? err.message : 'Could not check email config');
    }
  }, []);

  useEffect(() => {
    loadEmailStatus();
  }, [loadEmailStatus]);

  const channels: Array<'push' | 'email'> = [];
  if (push) channels.push('push');
  if (email) channels.push('email');

  const emailReady = emailStatus?.configured === true;

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
    if (email && !emailReady) {
      setError(
        'Email is not configured on Cloud Functions yet. Add RESEND_API_KEY and RESEND_FROM, then redeploy platformAdmin.'
      );
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
        <Text style={styles.backText}>Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Megaphone size={22} color={stamp.deep} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Messaging</Text>
          <Text style={styles.title}>Promo</Text>
          <Text style={styles.hint}>
            Expo push and/or Resend email. Confirm before send. Max 500 recipients.
          </Text>
        </View>
      </View>

      <View style={[styles.statusCard, emailReady ? styles.statusOk : styles.statusWarn]}>
        <Mail size={18} color={emailReady ? stamp.mintText : stamp.amberText} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>
            {emailReady ? 'Resend email ready' : 'Resend email not configured'}
          </Text>
          {emailReady ? (
            <Text style={styles.statusBody}>Email channel can send once you select it below.</Text>
          ) : (
            <Text style={styles.statusBody}>
              Add secrets <Text style={styles.mono}>RESEND_API_KEY</Text> and{' '}
              <Text style={styles.mono}>RESEND_FROM</Text> on Cloud Functions
              {emailStatus?.missing?.length
                ? ` (missing: ${emailStatus.missing.join(', ')})`
                : ''}
              , verify sender in Resend
              {emailStatus?.recommendedFrom ? ` (${emailStatus.recommendedFrom})` : ''}, redeploy
              `platformAdmin`. Push still works without Resend.
            </Text>
          )}
          {emailStatusError ? <Text style={styles.statusError}>{emailStatusError}</Text> : null}
          <TouchableOpacity onPress={loadEmailStatus} style={styles.refreshLink}>
            <Text style={styles.refreshLinkText}>Refresh email status</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          style={[styles.chip, email && styles.chipOn, email && !emailReady && styles.chipWarn]}
          onPress={() => setEmail((v) => !v)}
        >
          <Text style={[styles.chipText, email && styles.chipTextOn]}>
            Email{emailReady ? '' : ' (needs setup)'}
          </Text>
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
  hero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: stamp.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 16,
    marginTop: 4,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: stamp.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 2 },
  kicker: {
    fontFamily: outfit.semibold,
    fontSize: 12,
    color: stamp.sky,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 28,
    color: stamp.ink,
  },
  hint: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
    lineHeight: 18,
    marginTop: 2,
  },
  statusCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  statusWarn: {
    backgroundColor: stamp.amberBg,
    borderColor: '#F5D39A',
  },
  statusOk: {
    backgroundColor: stamp.mintBg,
    borderColor: '#A7E8C8',
  },
  statusCopy: { flex: 1, minWidth: 0, gap: 4 },
  statusTitle: {
    fontFamily: outfit.semibold,
    fontSize: 14,
    color: stamp.ink,
  },
  statusBody: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
    lineHeight: 18,
  },
  statusError: {
    fontFamily: outfit.medium,
    fontSize: 12,
    color: stamp.danger,
  },
  mono: {
    fontFamily: outfit.semibold,
    color: stamp.deep,
  },
  refreshLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  refreshLinkText: {
    fontFamily: outfit.semibold,
    fontSize: 13,
    color: stamp.deep,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: outfit.regular,
    fontSize: 15,
    color: stamp.ink,
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
    borderRadius: stamp.radiusPill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: stamp.white,
  },
  chipOn: {
    backgroundColor: stamp.skyTint,
    borderColor: stamp.sky,
  },
  chipWarn: {
    backgroundColor: stamp.amberBg,
    borderColor: stamp.amber,
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
    minHeight: stamp.buttonHeight,
    borderRadius: stamp.radiusButton,
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
    backgroundColor: 'rgba(6, 42, 68, 0.48)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: stamp.white,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontFamily: outfit.bold,
    fontSize: 18,
    color: stamp.ink,
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
    borderRadius: 14,
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
    borderRadius: 14,
    backgroundColor: stamp.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: outfit.semibold,
    color: stamp.white,
  },
});
