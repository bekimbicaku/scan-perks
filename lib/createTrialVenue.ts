import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { clearLocalBusinessDraft } from './businessDraft';
import { getAppWebOrigin } from './referral';
import { buildPrintedQrValue } from './qrLink';
import { buildVenueBillingFields, type VenueBillingFields } from './trial';

export type VenueLoyaltyInput = {
  scansRequired: number;
  reward: string;
  welcomeStampEnabled: boolean;
  birthdayRewardEnabled: boolean;
  birthdayReward: string;
};

export async function createVenueWithQr(input: {
  userId: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: { street: string; city: string; postalCode: string };
  logoUrl?: string | null;
  qrType: 'static' | 'dynamic';
  loyalty: VenueLoyaltyInput;
}): Promise<{ qrUrl: string; billing: VenueBillingFields }> {
  const userRef = doc(getDb(), 'users', input.userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const alreadyPaid = userData.subscribed === true && userData.planStatus === 'active';
  const now = new Date();
  const billing = buildVenueBillingFields({
    now,
    alreadyPaid,
    paidPlan: userData.plan === 'premium' ? 'premium' : 'basic',
  });
  const qrUrl = buildPrintedQrValue(input.userId, getAppWebOrigin());

  await setDoc(
    doc(getDb(), 'businesses', input.userId),
    {
      name: input.name,
      type: input.type,
      email: input.email,
      phone: input.phone,
      address: input.address,
      logoUrl: input.logoUrl || null,
      qrType: input.qrType,
      qrUrl,
      plan: billing.plan,
      planStatus: billing.planStatus,
      isActive: billing.isActive,
      isPremium: billing.isPremium,
      planStartDate: now,
      trialStartedAt: billing.trialStartedAt,
      trialEndsAt: billing.trialEndsAt,
      ownerId: input.userId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await setDoc(
    userRef,
    {
      businessDraft: null,
      onboardingStep: 'complete',
      updatedAt: now,
      ...(alreadyPaid
        ? {}
        : {
            plan: 'basic',
            planStatus: 'trial',
            subscribed: false,
            trialStartedAt: billing.trialStartedAt,
            trialEndsAt: billing.trialEndsAt,
          }),
    },
    { merge: true }
  );

  clearLocalBusinessDraft(input.userId);

  await setDoc(
    doc(getDb(), 'businesses', input.userId, 'settings', 'loyalty'),
    {
      scansRequired: input.loyalty.scansRequired,
      reward: input.loyalty.reward.trim() || 'A free item',
      welcomeStampEnabled: input.loyalty.welcomeStampEnabled,
      birthdayRewardEnabled: input.loyalty.birthdayRewardEnabled,
      birthdayReward: input.loyalty.birthdayReward.trim() || 'A birthday treat',
      lastModified: now,
    },
    { merge: true }
  );

  return { qrUrl, billing };
}
