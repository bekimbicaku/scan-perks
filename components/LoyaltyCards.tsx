import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { CreditCard } from 'lucide-react-native';
import { auth, getDb } from '@/lib/firebase';
import { getLoyaltySettings } from '@/lib/loyalty';
import { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import DigitalLoyaltyCard from '@/components/DigitalLoyaltyCard';
import { MemberPerkSettings } from '@/lib/memberPerks';
import { colors, spacing, typography } from '@/theme';

interface CardData {
  businessId: string;
  businessName: string;
  businessType?: string;
  totalScans: number;
  scansRequired: number;
  reward: string;
  memberPerk: Partial<MemberPerkSettings>;
}

export default function LoyaltyCards() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const scansSnap = await getDocs(
        collection(getDb(), 'users', auth.currentUser.uid, 'scans')
      );

      const loaded = await Promise.all(
        scansSnap.docs.map(async (scanDoc) => {
          const businessId = scanDoc.id;
          const totalScans = scanDoc.data().totalScans || 0;
          const [businessSnap, loyalty] = await Promise.all([
            getDoc(doc(getDb(), 'businesses', businessId)),
            getLoyaltySettings(businessId),
          ]);
          const business = businessSnap.data() || {};

          return {
            businessId,
            businessName: business.name || 'Business',
            businessType: business.type,
            totalScans,
            scansRequired: loyalty.scansRequired,
            reward: loyalty.reward,
            memberPerk: {
              memberPerkTitle: loyalty.memberPerkTitle,
              memberPerkDescription: loyalty.memberPerkDescription,
              memberDiscountPercent: loyalty.memberDiscountPercent,
            },
          } satisfies CardData;
        })
      );

      setCards(loaded.sort((a, b) => b.totalScans - a.totalScans));
    } catch (error) {
      console.error('Error loading loyalty cards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard>
        <Text style={styles.loading}>Loading loyalty cards...</Text>
      </GlassCard>
    );
  }

  if (cards.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={<CreditCard size={36} color={colors.primary} />}
          title="No loyalty cards yet"
          description="Scan a business QR code to unlock your digital loyalty card."
        />
      </GlassCard>
    );
  }

  return (
    <View style={styles.list}>
      {cards.map((card) => (
        <DigitalLoyaltyCard
          key={card.businessId}
          businessId={card.businessId}
          businessName={card.businessName}
          businessType={card.businessType}
          totalScans={card.totalScans}
          scansRequired={card.scansRequired}
          reward={card.reward}
          memberPerk={card.memberPerk}
          compact
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  loading: { ...typography.caption, textAlign: 'center', padding: spacing.md },
});
