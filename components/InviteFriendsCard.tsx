import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Share } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Link2, Check } from 'lucide-react-native';
import { auth, getDb } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import {
  APP_DISPLAY_NAME,
  getReferralInviteUrl,
  getReferralShareMessage,
  getWhatsAppInviteUrl,
} from '@/lib/referral';
import { copyToClipboard } from '@/lib/clipboard';
import { colors, spacing, typography } from '@/theme';

export default function InviteFriendsCard() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(getDb(), 'users', auth.currentUser.uid), (snap) => {
      const data = snap.data();
      setCode(data?.referralCode || '');
      setName(data?.name || '');
    });
    return () => unsub();
  }, []);

  if (!code) return null;

  const inviteUrl = getReferralInviteUrl(code);
  const shareMessage = getReferralShareMessage(code, name);

  const handleWhatsApp = async () => {
    const url = getWhatsAppInviteUrl(code, name);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen || Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    await Share.share({ message: shareMessage, title: `Join ${APP_DISPLAY_NAME}` });
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(inviteUrl);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Invite friends</Text>
      <Text style={styles.desc}>Share Scan Perks on WhatsApp or copy your personal link.</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.whatsapp} onPress={handleWhatsApp}>
          <MessageCircle size={16} color={colors.white} />
          <Text style={styles.whatsappText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.copy} onPress={handleCopy}>
          {copied ? <Check size={16} color={colors.success} /> : <Link2 size={16} color={colors.primaryDark} />}
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy link'}</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { ...typography.h3 },
  desc: { ...typography.caption, lineHeight: 20 },
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
    backgroundColor: colors.glass.tint,
    borderRadius: 14,
    paddingVertical: spacing.sm,
  },
  copyText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
