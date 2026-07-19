import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from './firebase';

export const REFERRAL_BONUS_SCANS = 2;
export const REFERRER_REWARD_SCANS = 1;

export async function processReferralSignup(userId: string, referrerCode: string) {
  const code = referrerCode.trim().toUpperCase();
  if (!code) return;

  const referrersQuery = query(collection(getDb(), 'users'), where('referralCode', '==', code));
  const referrersSnapshot = await getDocs(referrersQuery);
  if (referrersSnapshot.empty) return;

  const referrerDoc = referrersSnapshot.docs[0];
  if (referrerDoc.id === userId) return;

  await updateDoc(referrerDoc.ref, {
    referralCount: increment(1),
    referralBonusScans: increment(REFERRER_REWARD_SCANS),
    referralPoints: increment(5),
  });

  await updateDoc(doc(getDb(), 'users', userId), {
    referralBonusScans: REFERRAL_BONUS_SCANS,
    bonusPoints: increment(5),
  });
}

export interface StreakResult {
  streak: number;
  longestStreak: number;
  isNewRecord: boolean;
}

export async function updateScanStreak(userId: string): Promise<StreakResult> {
  const userRef = doc(getDb(), 'users', userId);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data() || {};

  const today = new Date().toISOString().split('T')[0];
  const lastStreakDate = data.lastStreakDate as string | undefined;
  const currentStreak = data.scanStreak || 0;
  const longestStreak = data.longestStreak || 0;

  let newStreak = currentStreak;
  if (lastStreakDate === today) {
    return { streak: currentStreak, longestStreak, isNewRecord: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastStreakDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(longestStreak, newStreak);

  await updateDoc(userRef, {
    scanStreak: newStreak,
    longestStreak: newLongest,
    lastStreakDate: today,
  });

  return {
    streak: newStreak,
    longestStreak: newLongest,
    isNewRecord: newStreak > longestStreak,
  };
}

export async function applyReferralBonusScan(userId: string): Promise<boolean> {
  const userRef = doc(getDb(), 'users', userId);
  const userDoc = await getDoc(userRef);
  const bonus = userDoc.data()?.referralBonusScans || 0;
  if (bonus <= 0) return false;

  await updateDoc(userRef, { referralBonusScans: increment(-1) });
  return true;
}

export async function toggleFavorite(userId: string, businessId: string): Promise<string[]> {
  const userRef = doc(getDb(), 'users', userId);
  const userDoc = await getDoc(userRef);
  const favorites: string[] = userDoc.data()?.favorites || [];

  const next = favorites.includes(businessId)
    ? favorites.filter((id) => id !== businessId)
    : [...favorites, businessId];

  await updateDoc(userRef, { favorites: next });
  return next;
}
