import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendPushNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const { businessId, title, body, data } = await request.json();

    if (!businessId || !title || !body) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Get all users who have scanned this business
    const scansQuery = query(
      collection(db, 'users'),
      where(`scans.${businessId}.totalScans`, '>', 0)
    );

    const usersSnapshot = await getDocs(scansQuery);
    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.expoPushToken) {
        notifications.push(
          sendPushNotification(
            userData.expoPushToken,
            title,
            body,
            {
              ...data,
              businessId,
              timestamp: new Date().toISOString(),
            }
          )
        );
      }
    }

    await Promise.all(notifications);

    return new Response(JSON.stringify({ success: true, notificationsSent: notifications.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}