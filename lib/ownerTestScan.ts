import { doc, getDoc, increment, runTransaction } from 'firebase/firestore';
import { auth, getDb } from './firebase';
import { DEFAULT_HAPPY_HOUR, HappyHourConfig, isHappyHourActive } from './features';
import { getLoyaltySettings } from './loyalty';
import { parseQRData } from './qr';
import { firstScanStampCount } from './scanStamp';

export type OwnerTestResult = {
  totalScans: number;
  scansRequired: number;
  reward: string;
  alreadyOnCard: boolean;
};

export async function runOwnerTestScan(rawData: string): Promise<OwnerTestResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const { businessId } = parseQRData(rawData);
  const businessSnap = await getDoc(doc(getDb(), 'businesses', businessId));
  if (!businessSnap.exists()) throw new Error('Business not found');
  const ownerId = businessSnap.data().ownerId;
  if (businessId !== user.uid || (typeof ownerId === 'string' && ownerId !== user.uid)) {
    throw new Error('Test scan only works on your own QR');
  }

  const loyalty = await getLoyaltySettings(businessId);
  const userScansRef = doc(getDb(), 'users', user.uid, 'scans', businessId);
  const existingSnap = await getDoc(userScansRef);
  const existingScans = existingSnap.exists() ? Number(existingSnap.data().totalScans) || 0 : 0;
  if (existingScans > 0) {
    return {
      totalScans: existingScans,
      scansRequired: loyalty.scansRequired,
      reward: loyalty.reward,
      alreadyOnCard: true,
    };
  }

  const happyHourSnap = await getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'happyHour'));
  const happyHour: HappyHourConfig = happyHourSnap.exists()
    ? { ...DEFAULT_HAPPY_HOUR, ...happyHourSnap.data() }
    : DEFAULT_HAPPY_HOUR;
  const welcomeStampApplied = !existingSnap.exists() && loyalty.welcomeStampEnabled;
  const scanIncrement = firstScanStampCount(
    isHappyHourActive(happyHour),
    happyHour.multiplier,
    welcomeStampApplied
  );

  // The owner's own card gets the stamp. Venue scan totals stay unchanged.
  const written = await runTransaction(getDb(), async (transaction) => {
    const fresh = await transaction.get(userScansRef);
    const freshTotal = fresh.exists() ? Number(fresh.data()?.totalScans) || 0 : 0;
    if (freshTotal > 0) return { totalScans: freshTotal, wrote: false };
    transaction.set(
      userScansRef,
      {
        businessId,
        totalScans: increment(scanIncrement),
        lastScan: new Date(),
      },
      { merge: true }
    );
    return { totalScans: scanIncrement, wrote: true };
  });

  return {
    totalScans: written.totalScans,
    scansRequired: loyalty.scansRequired,
    reward: loyalty.reward,
    alreadyOnCard: !written.wrote,
  };
}
