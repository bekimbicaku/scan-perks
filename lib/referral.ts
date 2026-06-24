const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const APP_DISPLAY_NAME = 'Scan Perks';

export function generateReferralCode(userId: string): string {
  const slice = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return `SP${slice}${suffix}`;
}

export function isValidReferralCode(code: string): boolean {
  return /^SP[A-Z0-9]{10,}$/.test(code.trim().toUpperCase());
}

export function getReferralInviteUrl(code: string): string {
  return `https://scanperks.app/invite/${code}`;
}

export function getReferralDeepLink(code: string): string {
  return `scanperks://register?ref=${code}`;
}

export function getReferralShareMessage(code: string, userName?: string): string {
  const inviteUrl = getReferralInviteUrl(code);
  const who = userName ? `${userName} invited you` : 'A friend invited you';
  return `${who} to ${APP_DISPLAY_NAME}!\n\nUse code: ${code}\nOr join: ${inviteUrl}\n\nScan QR codes at local businesses, earn rewards, and save worldwide.`;
}

export function getBusinessShareMessage(businessName: string, businessId: string): string {
  return `Discover ${businessName} on ${APP_DISPLAY_NAME}! Scan their QR code, collect stamps, and unlock rewards.\n\nhttps://scanperks.app/business/${businessId}`;
}
