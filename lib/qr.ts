import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function generateQRData(businessId: string, type: 'static' | 'dynamic', transactionId?: string) {
  // Verify business exists
  const businessRef = doc(db, 'businesses', businessId);
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

export function parseQRData(data: string) {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.businessId || !parsed.type) {
      throw new Error('Invalid QR code format');
    }
    return parsed;
  } catch (err) {
    throw new Error('Invalid QR code');
  }
}