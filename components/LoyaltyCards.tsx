import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { CreditCard } from 'lucide-react-native';
import { router } from 'expo-router';
import { auth, getDb } from '@/lib/firebase';
import { getLoyaltySettings } from '@/lib/loyalty';
import { GlassCard } from '@/components/ui/GlassBackground';
import EmptyState from '@/components/ui/EmptyState';
import DigitalLoyaltyCard from '@/components/DigitalLoyaltyCard';
import { MemberPerkSettings } from '@/lib/memberPerks';
import { spacing, typography, stamp, outfit } from '@/theme';

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
      <GlassCard stamp>
        <Text style={styles.loading}>Loading loyalty cards...</Text>
      </GlassCard>
    );
  }

  if (cards.length === 0) {
    return (
      <GlassCard stamp>
        <EmptyState
          align="left"
          iconBg={stamp.skyTint}
          icon={<CreditCard size={22} color={stamp.deep} />}
          title="No loyalty cards yet"
          description="Scan a business QR code to unlock your digital loyalty card."
          action={
            <TouchableOpacity onPress={() => router.push('/scan')} accessibilityRole="button" style={styles.openScan}>
              <Text style={styles.openScanText}>Open Scan</Text>
            </TouchableOpacity>
          }
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
  openScan: { minHeight: 44, justifyContent: 'center' },
  openScanText: { fontFamily: outfit.bold, fontSize: 15, color: stamp.deep },
});
