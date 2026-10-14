export const TRIAL_DAYS = 14;
export const STARTER_PRICE = 10;

export type PaidPlan = 'basic' | 'premium';

export type VenueBillingFields = {
  plan: PaidPlan;
  planStatus: 'trial' | 'active';
  isActive: true;
  isPremium: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'object' && value && 'seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function trialEndFrom(start: Date): Date {
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrialExpired(trialEndsAt: unknown, now = new Date()): boolean {
  const end = toDate(trialEndsAt);
  if (!end) return false;
  return end.getTime() <= now.getTime();
}

export function remainingTrialDays(trialEndsAt: unknown, now = new Date()): number {
  const end = toDate(trialEndsAt);
  if (!end) return 0;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function clampTrialDays(value: unknown): number | undefined {
  const days = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(days)) return undefined;
  const whole = Math.floor(days);
  if (whole < 1) return undefined;
  return Math.min(TRIAL_DAYS, whole);
}

export function buildVenueBillingFields(input: {
  now: Date;
  alreadyPaid: boolean;
  paidPlan?: PaidPlan;
}): VenueBillingFields {
  if (input.alreadyPaid) {
    const plan: PaidPlan = input.paidPlan === 'premium' ? 'premium' : 'basic';
    return {
      plan,
      planStatus: 'active',
      isActive: true,
      isPremium: plan === 'premium',
      trialStartedAt: null,
      trialEndsAt: null,
    };
  }

  return {
    plan: 'basic',
    planStatus: 'trial',
    isActive: true,
    isPremium: false,
    trialStartedAt: input.now,
    trialEndsAt: trialEndFrom(input.now),
  };
}

export function isVenueLive(
  data: { isActive?: boolean; planStatus?: string; trialEndsAt?: unknown },
  now = new Date()
): boolean {
  if (data.isActive === false) return false;
  if (data.planStatus === 'cancelled') return false;
  if (data.planStatus === 'trial' && isTrialExpired(data.trialEndsAt, now)) return false;
  return true;
}

export function scanBlockReason(
  data: { isActive?: boolean; planStatus?: string; trialEndsAt?: unknown; plan?: string },
  monthlyScans: number,
  now = new Date()
): string | null {
  if (data.isActive === false || data.planStatus === 'cancelled') {
    return 'This business is not currently active';
  }

  if (data.planStatus === 'trial' && isTrialExpired(data.trialEndsAt, now)) {
    return 'This venue’s free trial has ended. Starter billing has to start before new stamps count.';
  }

  const limit = data.plan === 'premium' ? Infinity : 500;
  if (monthlyScans >= limit) {
    return 'This business has reached its monthly scan limit. Please try again later.';
  }

  return null;
}
