export interface MemberPerkSettings {
  memberPerkTitle: string;
  memberPerkDescription: string;
  memberDiscountPercent: number;
}

export interface ReviewLinks {
  googleReviewUrl: string;
  tripAdvisorUrl: string;
}

export const EMPTY_MEMBER_PERK: MemberPerkSettings = {
  memberPerkTitle: '',
  memberPerkDescription: '',
  memberDiscountPercent: 0,
};

export const EMPTY_REVIEW_LINKS: ReviewLinks = {
  googleReviewUrl: '',
  tripAdvisorUrl: '',
};

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string): string {
  return value.trim();
}

export function hasMemberPerk(perk: Partial<MemberPerkSettings> | null | undefined): boolean {
  if (!perk) return false;
  return Boolean(
    (perk.memberPerkTitle && perk.memberPerkTitle.trim()) ||
      (perk.memberPerkDescription && perk.memberPerkDescription.trim()) ||
      (perk.memberDiscountPercent && perk.memberDiscountPercent > 0)
  );
}

export function formatMemberPerkLabel(perk: Partial<MemberPerkSettings>): string {
  if (perk.memberDiscountPercent && perk.memberDiscountPercent > 0) {
    const title = perk.memberPerkTitle?.trim() || 'Member discount';
    return `${perk.memberDiscountPercent}% off — ${title}`;
  }
  return perk.memberPerkTitle?.trim() || 'Member perk';
}

export function getBusinessDeepLink(businessId: string): string {
  const base = (process.env.EXPO_PUBLIC_APP_URL || 'https://app.scan-perks.com').replace(/\/$/, '');
  return `${base}/business/${businessId}`;
}
