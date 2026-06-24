import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Copy, Share2, Globe, Users, Gift, Check } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import {
  APP_DISPLAY_NAME,
  getReferralInviteUrl,
  getReferralShareMessage,
} from '@/lib/referral';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Share.share({ message: referralCode });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      message: getReferralShareMessage(referralCode, userName),
      title: `Join ${APP_DISPLAY_NAME}`,
      url: getReferralInviteUrl(referralCode),
    });
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Globe size={22} color={colors.primaryDark} />
        <Text style={styles.title}>Grow {APP_DISPLAY_NAME} Worldwide</Text>
      </View>
      <Text style={styles.desc}>
        Invite friends anywhere. You earn {REFERRER_REWARD_SCANS} bonus scan & 5 points per signup.
        They get {REFERRAL_BONUS_SCANS} bonus scans to start.
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
        <TouchableOpacity onPress={handleCopy} style={styles.iconBtn}>
          {copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color={colors.primaryDark} />}
        </TouchableOpacity>
      </View>

      <GlassButton
        label="Share Invite Link"
        onPress={handleShare}
        icon={<Share2 size={18} color={colors.white} />}
        style={styles.shareBtn}
      />
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
  shareBtn: { marginTop: spacing.xs },
});
