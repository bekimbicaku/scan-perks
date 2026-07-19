import Stripe from 'stripe';
import { STRIPE_PRODUCT_IDS, type StripePlanType } from '@/lib/stripeProducts';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

async function getActivePriceId(productId: string): Promise<string> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });

  const recurring =
    prices.data.find((price) => price.type === 'recurring') || prices.data[0];

  if (!recurring?.id) {
    throw new Error(`No active Stripe price found for product ${productId}`);
  }

  return recurring.id;
}

export async function GET() {
  return Response.json({
    ok: true,
    products: STRIPE_PRODUCT_IDS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = (body.plan === 'premium' ? 'premium' : 'basic') as StripePlanType;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const email = typeof body.email === 'string' ? body.email : undefined;
    const successUrl =
      typeof body.successUrl === 'string' && body.successUrl.startsWith('http')
        ? body.successUrl
        : 'https://app.scan-perks.com/payment-success';
    const cancelUrl =
      typeof body.cancelUrl === 'string' && body.cancelUrl.startsWith('http')
        ? body.cancelUrl
        : 'https://app.scan-perks.com/payment-cancelled';

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!(process.env.STRIPE_SECRET_KEY || process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY)) {
      return Response.json({ error: 'Stripe secret key is not configured' }, { status: 500 });
    }

    const productId = STRIPE_PRODUCT_IDS[plan];
    const priceId = await getActivePriceId(productId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.includes('{CHECKOUT_SESSION_ID}')
        ? successUrl
        : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        firebaseUid: userId,
        plan,
        productId,
      },
      subscription_data: {
        metadata: {
          firebaseUid: userId,
          plan,
          productId,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return Response.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 });
    }

    return Response.json({
      url: session.url,
      sessionId: session.id,
      plan,
      productId,
      priceId,
    });
  } catch (error) {
    console.error('[create-checkout-session]', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
