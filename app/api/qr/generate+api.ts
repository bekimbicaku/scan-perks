import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    // Verify API key
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    
    // Validate request body
    const body = await request.json();
    const { businessId, transactionId, amount, metadata } = body;

    if (!businessId || !transactionId || !amount) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Verify business exists and API key matches
    const businessRef = doc(db, 'businesses', businessId);
    const businessDoc = await getDoc(businessRef);

    if (!businessDoc.exists()) {
      return new Response('Business not found', { status: 404 });
    }

    const businessData = businessDoc.data();
    if (businessData.apiKey !== apiKey) {
      return new Response('Invalid API key', { status: 401 });
    }

    // Generate QR code data
    const qrData = {
      businessId,
      transactionId,
      amount,
      metadata,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiry
    };

    // Generate QR code image
    const qrImage = await QRCode.toDataURL(JSON.stringify(qrData));

    // Store QR code data in Firestore
    const qrRef = doc(db, 'businesses', businessId, 'qr_codes', transactionId);
    await setDoc(qrRef, {
      ...qrData,
      used: false,
    });

    return new Response(JSON.stringify({
      success: true,
      qrCode: qrImage,
      expiresAt: qrData.expiresAt,
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('QR Generation Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}