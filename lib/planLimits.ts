import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';

const PLAN_LIMITS = {
  basic: 500,
  premium: Infinity,
} as const;

export async function checkBusinessScanLimit(businessId: string): Promise<{ allowed: boolean; message?: string }> {
  const businessDoc = await getDoc(doc(getDb(), 'businesses', businessId));
  if (!businessDoc.exists()) {
    return { allowed: false, message: 'Business not found' };
  }

  const data = businessDoc.data();
  if (data.isActive === false || data.planStatus === 'cancelled') {
    return { allowed: false, message: 'This business is not currently active' };
  }

  const plan = (data.plan === 'premium' ? 'premium' : 'basic') as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[plan];

  if (limit === Infinity) {
    return { allowed: true };
  }

  const statsDoc = await getDoc(doc(getDb(), 'businesses', businessId, 'statistics', 'scans'));
  const totalScans = statsDoc.data()?.totalScans || 0;

  const planStart = data.planStartDate?.toDate?.() || data.createdAt?.toDate?.() || new Date();
  const monthStart = new Date(planStart);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const analyticsDoc = await getDoc(doc(getDb(), 'businesses', businessId, 'analytics', 'monthly'));
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthlyScans = analyticsDoc.data()?.[monthKey]?.scans || totalScans;

  if (monthlyScans >= limit) {
    return {
      allowed: false,
      message: 'This business has reached its monthly scan limit. Please try again later.',
    };
  }

  return { allowed: true };
}

export async function validateDynamicQR(
  businessId: string,
  transactionId: string
): Promise<{ valid: boolean; message?: string }> {
  const qrRef = doc(getDb(), 'businesses', businessId, 'qr_codes', transactionId);
  const qrDoc = await getDoc(qrRef);

  if (!qrDoc.exists()) {
    return { valid: false, message: 'Invalid or expired QR code' };
  }

  const data = qrDoc.data();
  if (data.used) {
    return { valid: false, message: 'This QR code has already been used' };
  }

  if (data.expiresAt) {
    const expires = new Date(data.expiresAt);
    if (expires < new Date()) {
      return { valid: false, message: 'This QR code has expired' };
    }
  }

  return { valid: true };
}
