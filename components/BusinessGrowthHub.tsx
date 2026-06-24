import { useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, Alert } from 'react-native';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Share2, Sparkles, Heart, Bell } from 'lucide-react-native';
import { getDb } from '@/lib/firebase';
import { getBusinessShareMessage } from '@/lib/referral';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, typography } from '@/theme';

interface BusinessGrowthHubProps {
  businessId: string;
  businessName: string;
}

const TIPS = [
  'Place your QR near the checkout so every customer can scan.',
  'Offer a limited-time deal to bring inactive customers back.',
  'Share your business link on Instagram & WhatsApp to reach new locals.',
];

export default function BusinessGrowthHub({ businessId, businessName }: BusinessGrowthHubProps) {
  const [sending, setSending] = useState(false);

  const handleShare = async () => {
    await Share.share({ message: getBusinessShareMessage(businessName, businessId) });
  };

  const handleWinBack = async () => {
    setSending(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      await addDoc(collection(getDb(), 'businesses', businessId, 'offers'), {
        title: 'We miss you! Come back for a special perk',
        description: 'Exclusive offer for returning customers. Scan today and enjoy a reward on us.',
        validFrom: Timestamp.now(),
        validUntil: Timestamp.fromDate(validUntil),
        terms: 'One per customer. Valid for 7 days.',
        sentAt: Timestamp.now(),
        engagement: { views: 0, claims: 0 },
        type: 'win-back',
      });

      Alert.alert('Win-back offer created', 'Your offer is live. Customers who scanned you will see it in the app.');
    } catch {
      Alert.alert('Error', 'Could not create win-back offer. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Grow Your Business"
        subtitle="Tools to attract & retain customers"
        icon={<Sparkles size={22} color={colors.primary} />}
      />

      <GlassCard style={styles.card}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={handleShare}>
            <Share2 size={22} color={colors.primaryDark} />
            <Text style={styles.actionText}>Share on social</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={handleWinBack} disabled={sending}>
            <Heart size={22} color={colors.error} />
            <Text style={styles.actionText}>{sending ? 'Creating...' : 'Win-back offer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => Alert.alert('Tip', TIPS[Math.floor(Math.random() * TIPS.length)])}>
            <Bell size={22} color={colors.warning} />
            <Text style={styles.actionText}>Growth tip</Text>
          </TouchableOpacity>
        </View>

        <GlassButton label="Share Business Link" onPress={handleShare} variant="secondary" />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  card: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: colors.glass.tint,
    gap: 6,
  },
  actionText: { ...typography.caption, fontSize: 11, textAlign: 'center', fontWeight: '600' },
});
