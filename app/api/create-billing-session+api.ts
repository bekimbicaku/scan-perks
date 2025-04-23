import { auth } from '@/lib/firebase';
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

    // Get user's Stripe customer ID from your database
    const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
    if (!userDoc.exists()) {
      return new Response('User not found', { status: 404 });
    }

    const stripeCustomerId = userDoc.data().stripeCustomerId;
    if (!stripeCustomerId) {
      return new Response('No associated Stripe customer', { status: 400 });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: typeof window !== 'undefined' ? window.location.origin : 'https://scanperks.app',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}