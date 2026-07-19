import { doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { PulseMood } from './features';

export async function submitScanPulse(businessId: string, mood: PulseMood) {
  const userId = (await import('./firebase')).auth.currentUser?.uid;
  if (!userId) return;

  await setDoc(
    doc(getDb(), 'businesses', businessId, 'pulse', 'summary'),
    { [mood]: increment(1), total: increment(1), lastUpdated: new Date() },
    { merge: true }
  );

  await setDoc(
    doc(getDb(), 'businesses', businessId, 'pulse_logs', `${userId}_${Date.now()}`),
    { userId, mood, createdAt: new Date() },
    { merge: true }
  );
}

export async function updateLocalPassport(businessType: string) {
  const { auth } = await import('./firebase');
  const userId = auth.currentUser?.uid;
  if (!userId) return null;

  const userRef = doc(getDb(), 'users', userId);
  const userDoc = await getDoc(userRef);
  const visited: string[] = userDoc.data()?.passportCategories || [];

  if (visited.includes(businessType)) return null;

  const next = [...visited, businessType];
  await updateDoc(userRef, { passportCategories: next });

  const { checkPassportUnlock } = await import('./features');
  return checkPassportUnlock(next);
}

export async function applySurpriseBonus(bonusScans: number) {
  const { auth } = await import('./firebase');
  const userId = auth.currentUser?.uid;
  if (!userId || bonusScans <= 0) return;

  await updateDoc(doc(getDb(), 'users', userId), {
    referralBonusScans: increment(bonusScans),
  });
}
