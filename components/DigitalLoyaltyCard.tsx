import { View, Text, StyleSheet, Share, Platform, Alert } from 'react-native';
import { CreditCard, Share2, Gift, Percent } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import {
  formatMemberPerkLabel,
  getBusinessDeepLink,
  hasMemberPerk,
  MemberPerkSettings,
} from '@/lib/memberPerks';
import { colors, spacing, typography, radius } from '@/theme';

export interface DigitalLoyaltyCardProps {
  businessId: string;
  businessName: string;
  businessType?: string;
  logoUrl?: string;
  totalScans: number;
  scansRequired: number;
  reward: string;
  memberPerk?: Partial<MemberPerkSettings> | null;
  compact?: boolean;
}

export default function DigitalLoyaltyCard({
  businessId,
  businessName,
  businessType,
  totalScans,
  scansRequired,
  reward,
  memberPerk,
  compact = false,
}: DigitalLoyaltyCardProps) {
  const required = Math.max(1, scansRequired);
  const inCycle = totalScans % required;
  const filled = totalScans > 0 && inCycle === 0 ? required : inCycle;
  const deepLink = getBusinessDeepLink(businessId);
  const cardPayload = JSON.stringify({
    type: 'scanperks_loyalty_card',
    businessId,
    businessName,
    totalScans,
    scansRequired: required,
    reward,
  });

  const shareCard = async () => {
    const message = `My Scan Perks loyalty card at ${businessName}: ${filled}/${required} stamps toward ${reward}.\n${deepLink}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${businessName} Loyalty Card`, text: message, url: deepLink });
        return;
      }
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        Alert.alert('Copied', 'Loyalty card link copied to clipboard.');
        return;
      }
      await Share.share({ message, title: `${businessName} Loyalty Card` });
    } catch {
      // User cancelled share — ignore
    }
  };

  return (
    <GlassCard style={[styles.card, compact && styles.compact]}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <CreditCard size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Digital Loyalty Card</Text>
          <Text style={styles.name} numberOfLines={1}>
            {businessName}
          </Text>
          {businessType ? <Text style={styles.type}>{businessType}</Text> : null}
        </View>
      </View>

      <View style={styles.stamps}>
        {Array.from({ length: required }).map((_, index) => (
          <View
            key={index}
            style={[styles.stamp, index < filled && styles.stampFilled]}
          />
        ))}
      </View>

      <Text style={styles.progress}>
        {filled}/{required} stamps
        {filled === required && totalScans > 0 ? ' · Reward ready!' : ''}
      </Text>

      <View style={styles.rewardRow}>
        <Gift size={16} color={colors.primary} />
        <Text style={styles.rewardText} numberOfLines={2}>
          {reward}
        </Text>
      </View>

      {hasMemberPerk(memberPerk) ? (
        <View style={styles.perkRow}>
          <Percent size={16} color={colors.success} />
          <View style={styles.flex}>
            <Text style={styles.perkTitle}>{formatMemberPerkLabel(memberPerk || {})}</Text>
            {memberPerk?.memberPerkDescription ? (
              <Text style={styles.perkDesc} numberOfLines={2}>
                {memberPerk.memberPerkDescription}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.qrWrap}>
          <QRCodeGenerator value={cardPayload} size={120} />
          <Text style={styles.qrHint}>Show this card in-store</Text>
        </View>
      ) : null}

      <GlassButton
        label="Share card"
        variant="secondary"
        onPress={shareCard}
        icon={<Share2 size={16} color={colors.primaryDark} />}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  compact: { marginBottom: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glass.backgroundStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  eyebrow: { ...typography.label, fontSize: 11, color: colors.primaryDark },
  name: { ...typography.h3, fontSize: 17 },
  type: { ...typography.caption, marginTop: 2 },
  stamps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  stamp: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.offWhite,
  },
  stampFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  progress: { ...typography.caption, fontWeight: '600' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rewardText: { ...typography.body, fontSize: 14, flex: 1 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  perkTitle: { ...typography.body, fontSize: 13, fontWeight: '600', color: colors.success },
  perkDesc: { ...typography.caption, marginTop: 2 },
  qrWrap: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  qrHint: { ...typography.caption, fontSize: 12 },
});
