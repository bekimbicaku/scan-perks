import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export async function generateQRData(businessId: string, type: 'static' | 'dynamic', transactionId?: string) {
  // Verify business exists
  const businessRef = doc(getDb(), 'businesses', businessId);
  const businessDoc = await getDoc(businessRef);

  if (!businessDoc.exists()) {
    throw new Error('Business not found');
  }

  const qrData = {
    businessId,
    type,
    ...(transactionId && { transactionId }),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(qrData);
}

export interface ParsedQRData {
  businessId: string;
  type?: 'static' | 'dynamic' | 'reward';
  transactionId?: string;
  timestamp?: string;
  expiresAt?: string;
}

export function parseQRData(data: string): ParsedQRData {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.businessId) {
      throw new Error('Invalid QR code format');
    }
    return parsed;
  } catch {
    throw new Error('Invalid QR code');
  }
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