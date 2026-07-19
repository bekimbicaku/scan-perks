const TEST_STRIPE_PAYMENT_LINKS = {
  basic: 'https://buy.stripe.com/test_dR6eXddT75D13Ha6op',
  premium: 'https://buy.stripe.com/test_5kA9CT6qF7L97Xq000',
} as const;

export type StripePlanType = keyof typeof TEST_STRIPE_PAYMENT_LINKS;

export function getStripePaymentLink(plan: StripePlanType): string {
  const envKey =
    plan === 'basic'
      ? process.env.EXPO_PUBLIC_STRIPE_LINK_BASIC
      : process.env.EXPO_PUBLIC_STRIPE_LINK_PREMIUM;

  if (envKey?.trim()) {
    return envKey.trim();
  }

  return TEST_STRIPE_PAYMENT_LINKS[plan];
}

export function isStripeTestMode(): boolean {
  return getStripePaymentLink('basic').includes('/test_');
}
