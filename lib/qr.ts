import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { getAppWebOrigin } from './referral';
import { buildPrintedQrValue, parseQRData, type ParsedQRData } from './qrLink';

export { parseQRData };
export type { ParsedQRData };

export async function generateQRData(businessId: string, type: 'static' | 'dynamic', transactionId?: string) {
  const businessRef = doc(getDb(), 'businesses', businessId);
  const businessDoc = await getDoc(businessRef);

  if (!businessDoc.exists()) {
    throw new Error('Business not found');
  }

  const url = new URL(buildPrintedQrValue(businessId, getAppWebOrigin()));
  if (type === 'dynamic' && transactionId) {
    url.searchParams.set('type', 'dynamic');
    url.searchParams.set('transactionId', transactionId);
  }
  return url.toString();
}

export function buildRewardQRData(rewardId: string, userId: string, businessId: string): string {
  return JSON.stringify({
    type: 'reward',
    rewardId,
    userId,
    businessId,
    timestamp: new Date().toISOString(),
  });
}
