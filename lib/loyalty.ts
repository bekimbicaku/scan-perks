import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export const DEFAULT_SCANS_REQUIRED = 10;

export interface LoyaltySettings {
  scansRequired: number;
  reward: string;
  memberPerkTitle: string;
  memberPerkDescription: string;
  memberDiscountPercent: number;
}

export async function getLoyaltySettings(businessId: string): Promise<LoyaltySettings> {
  const settingsDoc = await getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'loyalty'));
  if (settingsDoc.exists()) {
    const data = settingsDoc.data();
    return {
      scansRequired: data.scansRequired || DEFAULT_SCANS_REQUIRED,
      reward: data.reward || 'A special reward',
      memberPerkTitle: data.memberPerkTitle || '',
      memberPerkDescription: data.memberPerkDescription || '',
      memberDiscountPercent: Number(data.memberDiscountPercent) || 0,
    };
  }
  return {
    scansRequired: DEFAULT_SCANS_REQUIRED,
    reward: 'A special reward',
    memberPerkTitle: '',
    memberPerkDescription: '',
    memberDiscountPercent: 0,
  };
}

export function calculateScanProgress(totalScans: number, scansRequired: number) {
  const normalizedRequired = Math.max(1, scansRequired);
  const progressInCycle = totalScans % normalizedRequired;
  const scansUntilReward = progressInCycle === 0 && totalScans > 0
    ? 0
    : normalizedRequired - progressInCycle;
  const newRewardEarned = totalScans > 0 && totalScans % normalizedRequired === 0;
  const progressPercent = newRewardEarned
    ? 100
    : (progressInCycle / normalizedRequired) * 100;

  return {
    scansRequired: normalizedRequired,
    scansUntilReward: newRewardEarned ? normalizedRequired : scansUntilReward,
    newRewardEarned,
    progressPercent,
    currentInCycle: newRewardEarned ? normalizedRequired : progressInCycle,
  };
}

export function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
