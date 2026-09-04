import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Share } from 'react-native';
import { Copy, Share2, Users, Gift, Check, MessageCircle, Link2 } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import {
  APP_DISPLAY_NAME,
  getReferralInviteUrl,
  getReferralShareMessage,
  getWhatsAppInviteUrl,
} from '@/lib/referral';
import { copyToClipboard } from '@/lib/clipboard';
import { REFERRAL_BONUS_SCANS, REFERRER_REWARD_SCANS } from '@/lib/engagement';
import { colors, spacing, typography } from '@/theme';

interface ReferralHubProps {
  referralCode: string;
  referralCount?: number;
  referralBonusScans?: number;
  userName?: string;
}

export default function ReferralHub({
  referralCode,
  referralCount = 0,
  referralBonusScans = 0,
  userName,
}: ReferralHubProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const inviteUrl = getReferralInviteUrl(referralCode);
  const shareMessage = getReferralShareMessage(referralCode, userName);

  const flashCopied = (kind: 'code' | 'link') => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(referralCode);
    if (ok) flashCopied('code');
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(inviteUrl);
    if (ok) flashCopied('link');
  };

  const handleWhatsApp = async () => {
    const url = getWhatsAppInviteUrl(referralCode, userName);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen || Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    await Share.share({ message: shareMessage, title: `Join ${APP_DISPLAY_NAME}` });
  };

  const handleShare = async () => {
    await Share.share({
      message: shareMessage,
      title: `Join ${APP_DISPLAY_NAME}`,
      url: inviteUrl,
    });
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Users size={22} color={colors.primaryDark} />
        <Text style={styles.title}>Invite friends</Text>
      </View>
      <Text style={styles.desc}>
        Share via WhatsApp or copy your link. You earn {REFERRER_REWARD_SCANS} bonus scan and 5
        points per signup. They get {REFERRAL_BONUS_SCANS} bonus scans to start.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.miniStat}>
          <Users size={18} color={colors.primary} />
          <Text style={styles.miniValue}>{referralCount}</Text>
          <Text style={styles.miniLabel}>Invited</Text>
        </View>
        <View style={styles.miniStat}>
          <Gift size={18} color={colors.success} />
          <Text style={styles.miniValue}>{referralBonusScans}</Text>
          <Text style={styles.miniLabel}>Bonus scans</Text>
        </View>
      </View>

      <Text style={styles.codeLabel}>Your invite code</Text>
      <View style={styles.codeRow}>
        <Text style={styles.code}>{referralCode}</Text>
        <TouchableOpacity onPress={handleCopyCode} style={styles.iconBtn} accessibilityLabel="Copy invite code">
          {copied === 'code' ? (
            <Check size={18} color={colors.success} />
          ) : (
            <Copy size={18} color={colors.primaryDark} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <GlassButton
          label="Invite on WhatsApp"
          onPress={handleWhatsApp}
          icon={<MessageCircle size={18} color={colors.white} />}
        />
        <GlassButton
          label={copied === 'link' ? 'Link copied' : 'Copy invite link'}
          onPress={handleCopyLink}
          variant="secondary"
          icon={
            copied === 'link' ? (
              <Check size={18} color={colors.primaryDark} />
            ) : (
              <Link2 size={18} color={colors.primaryDark} />
            )
          }
        />
        <GlassButton
          label="More ways to share"
          onPress={handleShare}
          variant="ghost"
          icon={<Share2 size={18} color={colors.primaryDark} /> }
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h3, flex: 1 },
  desc: { ...typography.caption, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: colors.glass.tint,
  },
  miniValue: { fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: 4 },
  miniLabel: { ...typography.caption, fontSize: 11 },
  codeLabel: { ...typography.label, marginTop: spacing.xs },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass.tint,
    borderRadius: 14,
    padding: spacing.md,
  },
  code: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, letterSpacing: 2 },
  iconBtn: { padding: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
