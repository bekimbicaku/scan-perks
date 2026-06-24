import Stripe from 'stripe';
import { getFirestoreUserData, verifyFirebaseToken } from '@/lib/server/verifyFirebaseToken';

const stripe = new Stripe(process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function resolveStripeCustomerId(
  stripeCustomerId: string | undefined,
  email: string | undefined,
  uid: string,
  subscribed?: boolean
): Promise<string | null> {
  if (stripeCustomerId) {
    return stripeCustomerId;
  }

  if (email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data[0]?.id) {
      return customers.data[0].id;
    }
  }

  if (email && subscribed) {
    const customer = await stripe.customers.create({
      email,
      metadata: { firebaseUid: uid },
    });
    return customer.id;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyFirebaseToken(token);

    const body = await request.json().catch(() => ({}));
    const returnUrl =
      typeof body.returnUrl === 'string' && body.returnUrl.startsWith('http')
        ? body.returnUrl
        : 'https://scanperks.app/business';

    const userData = await getFirestoreUserData(decoded.uid, token);
    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const stripeCustomerId = await resolveStripeCustomerId(
      userData.stripeCustomerId as string | undefined,
      decoded.email,
      decoded.uid,
      userData.subscribed === true
    );

    if (!stripeCustomerId) {
      return Response.json(
        {
          error:
            'No Stripe billing profile found. Subscribe first, then manage billing from here.',
        },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return Response.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating billing portal session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
