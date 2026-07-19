import Stripe from 'stripe';
import { verifyFirebaseToken } from '@/lib/server/verifyFirebaseToken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

function resolvePlan(session: Stripe.Checkout.Session): 'basic' | 'premium' {
  const metaPlan = session.metadata?.plan;
  if (metaPlan === 'premium' || metaPlan === 'basic') return metaPlan;
  return session.amount_total === 1000 ? 'basic' : 'premium';
}

function resolveUserId(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.firebaseUid || null;
}

/**
 * Local/dev fallback. Production uses Cloud Function verifyCheckoutSession.
 * Note: This path can confirm Stripe payment but cannot write Admin Firestore
 * without a service account — so production must use the Cloud Function.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    const user = await verifyFirebaseToken(idToken);
    const body = await request.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    if (!sessionId.startsWith('cs_')) {
      return Response.json({ error: 'Valid sessionId is required' }, { status: 400 });
    }

    if (!(process.env.STRIPE_SECRET_KEY || process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY)) {
      return Response.json({ error: 'Stripe secret key is not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = resolveUserId(session);

    if (!sessionUserId || sessionUserId !== user.uid) {
      return Response.json({ error: 'Checkout session does not belong to this user' }, { status: 403 });
    }

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return Response.json({
        ok: false,
        status: session.status,
        paymentStatus: session.payment_status,
      });
    }

    return Response.json({
      ok: true,
      plan: resolvePlan(session),
      paymentId: session.subscription || session.id,
      paymentStatus: session.payment_status,
      // Client should still rely on Cloud Function for Firestore activation in production.
      activateViaCloudFunction: true,
    });
  } catch (error) {
    console.error('[verify-checkout-session]', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify checkout session',
      },
      { status: 500 }
    );
  }
}
