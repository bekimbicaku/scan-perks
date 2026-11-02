import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Share } from 'react-native';
import { Coffee, MessageCircle, Link2, Check } from 'lucide-react-native';
import { auth } from '@/lib/firebase';
import { loadUsualCafe, saveUsualCafe } from '@/lib/cafeRequest';
import { validateCafeName } from '@/lib/cafeRequestRecord';
import { LAUNCH_CITY } from '@/lib/launchCity';
import { askCafeMessage, buildBusinessStartUrl, whatsAppShareUrl } from '@/lib/businessStart';
import { copyToClipboard } from '@/lib/clipboard';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import { colors, spacing, typography } from '@/theme';

export default function EmptyMarketHome() {
  const [cafeName, setCafeName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'instagram' | 'link' | ''>('');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    let cancelled = false;
    loadUsualCafe(userId)
      .then((name) => {
        if (cancelled || !name) return;
        setCafeName(name);
        setSavedName(name);
      })
      .catch((err) => {
        console.warn('[cafe] load failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const invalid = validateCafeName(cafeName);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const record = await saveUsualCafe(userId, cafeName, LAUNCH_CITY);
      setCafeName(record.cafeName);
      setSavedName(record.cafeName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that cafe');
    } finally {
      setSaving(false);
    }
  };

  const userId = auth.currentUser?.uid || '';
  const signupLink =
    savedName && userId ? buildBusinessStartUrl({ from: userId, cafe: savedName }) : '';
  const askMessage = savedName && signupLink ? askCafeMessage(savedName, signupLink) : '';
  const nameChanged = Boolean(savedName) && cafeName.trim() !== savedName;

  const shareWhatsApp = async () => {
    if (!askMessage) return;
    const url = whatsAppShareUrl(askMessage);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen || Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    await Share.share({ message: askMessage });
  };

  const copyMessage = async () => {
    if (!askMessage) return;
    const ok = await copyToClipboard(askMessage);
    if (!ok) return;
    setCopied('instagram');
  };

  const copyLink = async () => {
    if (!signupLink) return;
    const ok = await copyToClipboard(signupLink);
    if (!ok) return;
    setCopied('link');
  };

  return (
    <GlassCard>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Coffee size={28} color={colors.primaryDark} />
        </View>
        <Text style={styles.city}>Opening in {LAUNCH_CITY}</Text>
        <Text style={styles.note}>Stamp cards show up here after a cafe puts a QR on the counter.</Text>
        <Text style={styles.label}>Your usual cafe</Text>
        <GlassInput
          value={cafeName}
          onChangeText={(text) => {
            setCafeName(text);
            setError('');
          }}
          placeholder="Cafe name"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Your usual cafe"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {savedName ? (
          <Text style={styles.saved}>
            Saved. Ask {savedName} to join and you get a bonus stamp there.
          </Text>
        ) : null}
        {askMessage && !nameChanged ? (
          <View style={styles.ask}>
            <Text style={styles.askTitle}>Ask them to join</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.whatsapp} onPress={shareWhatsApp} accessibilityLabel="Ask on WhatsApp">
                <MessageCircle size={16} color={colors.white} />
                <Text style={styles.whatsappText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copy} onPress={copyMessage} accessibilityLabel="Copy for Instagram">
                {copied === 'instagram' ? (
                  <Check size={16} color={colors.success} />
                ) : (
                  <MessageCircle size={16} color={colors.primaryDark} />
                )}
                <Text style={styles.copyText}>{copied === 'instagram' ? 'Copied' : 'Instagram'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.copy} onPress={copyLink} accessibilityLabel="Copy signup link">
              {copied === 'link' ? <Check size={16} color={colors.success} /> : <Link2 size={16} color={colors.primaryDark} />}
              <Text style={styles.copyText}>{copied === 'link' ? 'Copied' : 'Copy link'}</Text>
            </TouchableOpacity>
            {copied === 'instagram' ? (
              <Text style={styles.hint}>Paste this into an Instagram DM.</Text>
            ) : null}
            <Text selectable style={styles.preview}>
              {askMessage}
            </Text>
          </View>
        ) : (
          <GlassButton
            label={saving ? 'Saving...' : 'Send'}
            onPress={handleSubmit}
            disabled={saving}
            loading={saving}
          />
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.tint,
    alignSelf: 'center',
  },
  city: { ...typography.h2, textAlign: 'center', fontSize: 22 },
  note: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
  label: { ...typography.h3, fontSize: 16, marginTop: spacing.xs },
  error: { color: colors.error, fontSize: 14 },
  saved: { ...typography.caption, color: colors.success, lineHeight: 20 },
  ask: { gap: spacing.sm, marginTop: spacing.xs },
  askTitle: { ...typography.h3, fontSize: 16 },
  preview: { ...typography.caption, lineHeight: 20 },
  row: { flexDirection: 'row', gap: spacing.sm },
  whatsapp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: spacing.sm,
  },
  whatsappText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  copyText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  hint: { ...typography.caption, color: colors.success },
});
