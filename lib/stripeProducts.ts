export type StripePlanType = 'basic' | 'premium';

/** Stripe Product IDs (Starter = basic, Growth = premium) */
export const STRIPE_PRODUCT_IDS: Record<StripePlanType, string> = {
  basic:
    process.env.EXPO_PUBLIC_STRIPE_PRODUCT_STARTER?.trim() ||
    'prod_UuhFUxyxEZPENE',
  premium:
    process.env.EXPO_PUBLIC_STRIPE_PRODUCT_GROWTH?.trim() ||
    'prod_UuhGlzjSeNaCwR',
};

export const PLAN_DISPLAY_NAMES: Record<StripePlanType, string> = {
  basic: 'Starter',
  premium: 'Growth',
};

export function planFromAmount(amount: number): StripePlanType {
  return amount <= 10 ? 'basic' : 'premium';
}

export function planFromDisplayName(name: string): StripePlanType {
  const normalized = name.toLowerCase();
  if (normalized.includes('growth') || normalized.includes('premium')) {
    return 'premium';
  }
  return 'basic';
}
