import type { StripePlanType } from '@/lib/stripeProducts';

/** Live Stripe Payment Links — Starter (basic) / Growth (premium) */
const PAYMENT_LINKS: Record<StripePlanType, string> = {
  basic: 'https://buy.stripe.com/6oU14o6JodDHaQc5AY8EM00',
  premium: 'https://buy.stripe.com/7sY5kE4BgczDe2o5AY8EM01',
};

export function getStripePaymentLink(plan: StripePlanType): string {
  const envKey =
    plan === 'basic'
      ? process.env.EXPO_PUBLIC_STRIPE_LINK_BASIC
      : process.env.EXPO_PUBLIC_STRIPE_LINK_PREMIUM;

  if (envKey?.trim()) {
    return envKey.trim();
  }

  return PAYMENT_LINKS[plan];
}

export function isStripeTestMode(): boolean {
  return getStripePaymentLink('basic').includes('/test_');
}
