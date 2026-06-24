import {
  doc,
  getDoc,
  setDoc,
  increment,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { auth, getDb } from './firebase';
import {
  getLoyaltySettings,
  calculateScanProgress,
  isToday,
} from './loyalty';
import { checkBusinessScanLimit, validateDynamicQR } from './planLimits';
import { parseQRData } from './qr';
import { updateScanStreak, applyReferralBonusScan } from './engagement';
import { HappyHourConfig, DEFAULT_HAPPY_HOUR, isHappyHourActive } from './features';

export interface ScanResult {
  totalScans: number;
  scansRequired: number;
  scansUntilReward: number;
  newRewardEarned: boolean;
  progressPercent: number;
  rewardDescription: string;
  businessName: string;
  businessId: string;
  businessType: string;
  happyHourActive: boolean;
  happyHourMultiplier: number;
  rewardEtaDays: number | null;
}

export async function processBusinessScan(rawData: string): Promise<ScanResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  let qrData: ReturnType<typeof parseQRData>;
  try {
    qrData = parseQRData(rawData);
  } catch {
    const parsed = JSON.parse(rawData);
    if (!parsed.businessId) throw new Error('Invalid QR code format');
    qrData = parsed;
  }

  const { businessId, transactionId } = qrData;
  const type = qrData.type || (transactionId ? 'dynamic' : 'static');

  const businessRef = doc(getDb(), 'businesses', businessId);
  const businessDoc = await getDoc(businessRef);

  if (!businessDoc.exists()) {
    throw new Error('Business not found');
  }

  const businessData = businessDoc.data();
  const limitCheck = await checkBusinessScanLimit(businessId);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Scan not allowed');
  }

  if (type === 'dynamic' && transactionId) {
    const dynamicCheck = await validateDynamicQR(businessId, transactionId);
    if (!dynamicCheck.valid) {
      throw new Error(dynamicCheck.message || 'Invalid dynamic QR');
    }
  }

  const userScansRef = doc(getDb(), 'users', user.uid, 'scans', businessId);
  const userScansDoc = await getDoc(userScansRef);

  if (userScansDoc.exists()) {
    const lastScan = userScansDoc.data().lastScan?.toDate();
    if (lastScan && isToday(lastScan)) {
      throw new Error('You can only scan once per day at this business');
    }
  }

  const loyalty = await getLoyaltySettings(businessId);
  const isNewCustomer = !userScansDoc.exists();

  const happyHourDoc = await getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'happyHour'));
  const happyHour: HappyHourConfig = happyHourDoc.exists()
    ? { ...DEFAULT_HAPPY_HOUR, ...happyHourDoc.data() }
    : DEFAULT_HAPPY_HOUR;
  const happyHourActive = isHappyHourActive(happyHour);
  const scanIncrement = happyHourActive ? happyHour.multiplier : 1;

  await runTransaction(getDb(), async (transaction) => {
    transaction.set(
      userScansRef,
      {
        businessId,
        totalScans: increment(scanIncrement),
        lastScan: new Date(),
      },
      { merge: true }
    );

    const businessStatsRef = doc(getDb(), 'businesses', businessId, 'statistics', 'scans');
    transaction.set(
      businessStatsRef,
      {
        totalScans: increment(1),
        uniqueCustomers: increment(isNewCustomer ? 1 : 0),
        lastScanAt: new Date(),
      },
      { merge: true }
    );

    const customerRef = doc(getDb(), 'businesses', businessId, 'customers', user.uid);
    transaction.set(
      customerRef,
      {
        userId: user.uid,
        totalScans: increment(scanIncrement),
        lastScan: new Date(),
      },
      { merge: true }
    );

    const today = new Date().toISOString().split('T')[0];
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const businessAnalyticsRef = doc(getDb(), 'businesses', businessId, 'analytics', 'daily');
    transaction.set(
      businessAnalyticsRef,
      {
        [`${today}.scans`]: increment(1),
        [`${today}.uniqueCustomers`]: increment(isNewCustomer ? 1 : 0),
      },
      { merge: true }
    );

    const monthlyRef = doc(getDb(), 'businesses', businessId, 'analytics', 'monthly');
    transaction.set(
      monthlyRef,
      {
        [`${monthKey}.scans`]: increment(1),
      },
      { merge: true }
    );
  });

  if (type === 'dynamic' && transactionId) {
    await updateDoc(doc(getDb(), 'businesses', businessId, 'qr_codes', transactionId), {
      used: true,
      usedAt: new Date(),
      usedBy: user.uid,
    });
  }

  if (await applyReferralBonusScan(user.uid)) {
    await updateDoc(userScansRef, { totalScans: increment(1) });
  }

  await updateScanStreak(user.uid);

  const updatedScansDoc = await getDoc(userScansRef);
  const totalScans = updatedScansDoc.data()?.totalScans || 1;
  const progress = calculateScanProgress(totalScans, loyalty.scansRequired);

  const { estimateRewardEtaDays } = await import('./features');
  const scanHistory = userScansDoc.data()?.lastScan
    ? [userScansDoc.data()!.lastScan.toDate(), new Date()]
    : [new Date()];
  const rewardEtaDays = estimateRewardEtaDays(totalScans, loyalty.scansRequired, scanHistory);

  if (progress.newRewardEarned) {
    const rewardRef = doc(getDb(), 'users', user.uid, 'rewards', `${businessId}_${totalScans}`);
    await setDoc(rewardRef, {
      businessId,
      businessName: businessData.name,
      rewardDescription: loyalty.reward,
      scansRequired: loyalty.scansRequired,
      createdAt: new Date(),
      redeemed: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const businessRewardsRef = doc(getDb(), 'businesses', businessId, 'statistics', 'rewards');
    await setDoc(
      businessRewardsRef,
      {
        totalRewardsIssued: increment(1),
        lastRewardIssuedAt: new Date(),
      },
      { merge: true }
    );
  }

  return {
    totalScans,
    scansRequired: loyalty.scansRequired,
    scansUntilReward: progress.scansUntilReward,
    newRewardEarned: progress.newRewardEarned,
    progressPercent: progress.progressPercent,
    rewardDescription: loyalty.reward,
    businessName: businessData.name || 'Business',
    businessId,
    businessType: businessData.type || 'Other',
    happyHourActive,
    happyHourMultiplier: happyHour.multiplier,
    rewardEtaDays,
  };
}

export interface RedeemResult {
  success: boolean;
  rewardDescription: string;
  customerId: string;
}

export async function processRewardRedemption(rawData: string, expectedBusinessId: string): Promise<RedeemResult> {
  const staffUser = auth.currentUser;
  if (!staffUser) throw new Error('Not authenticated');

  const parsed = JSON.parse(rawData);
  if (parsed.type !== 'reward' || !parsed.rewardId || !parsed.userId || !parsed.businessId) {
    throw new Error('Invalid reward QR code');
  }

  if (parsed.businessId !== expectedBusinessId) {
    throw new Error('This reward belongs to a different business');
  }

  const businessDoc = await getDoc(doc(getDb(), 'businesses', expectedBusinessId));
  if (!businessDoc.exists() || businessDoc.data().ownerId !== staffUser.uid) {
    throw new Error('You are not authorized to redeem rewards for this business');
  }

  const rewardRef = doc(getDb(), 'users', parsed.userId, 'rewards', parsed.rewardId);
  const rewardDoc = await getDoc(rewardRef);

  if (!rewardDoc.exists()) {
    throw new Error('Reward not found');
  }

  const rewardData = rewardDoc.data();
  if (rewardData.redeemed) {
    throw new Error('This reward has already been redeemed');
  }

  const expiresAt = rewardData.expiresAt?.toDate?.() || new Date(rewardData.expiresAt);
  if (expiresAt && expiresAt < new Date()) {
    throw new Error('This reward has expired');
  }

  await updateDoc(rewardRef, {
    redeemed: true,
    redeemedAt: new Date(),
    redeemedBy: staffUser.uid,
  });

  const businessRewardsRef = doc(getDb(), 'businesses', expectedBusinessId, 'statistics', 'rewards');
  await setDoc(
    businessRewardsRef,
    {
      totalRewardsRedeemed: increment(1),
      lastRewardRedeemedAt: new Date(),
    },
    { merge: true }
  );

  return {
    success: true,
    rewardDescription: rewardData.rewardDescription || 'Reward',
    customerId: parsed.userId,
  };
}
