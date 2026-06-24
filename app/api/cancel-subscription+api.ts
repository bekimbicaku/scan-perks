import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const { businessId, stripeSubscriptionId } = await request.json();

    if (!businessId || !stripeSubscriptionId) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Verify business ownership
    const businessDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!businessDoc.exists() || businessDoc.data().ownerId !== decodedToken.uid) {
      return new Response('Not authorized to cancel this subscription', { status: 403 });
    }

    // Cancel Stripe subscription
    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (stripeError: any) {
      console.error('Stripe subscription cancellation error:', stripeError);
      return new Response(JSON.stringify({ 
        error: 'Failed to cancel Stripe subscription',
        details: stripeError.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in cancel-subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}