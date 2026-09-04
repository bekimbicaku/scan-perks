import { STORE_LINKS } from '@/lib/version';

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

export function getAppWebOrigin(): string {
  return STORE_LINKS.web.replace(/\/$/, '');
}

export function getReferralInviteUrl(code: string): string {
  return `${getAppWebOrigin()}/invite/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function getReferralDeepLink(code: string): string {
  return `scanperks://invite/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function getReferralShareMessage(code: string, userName?: string): string {
  const inviteUrl = getReferralInviteUrl(code);
  const who = userName ? `${userName} invited you` : 'A friend invited you';
  return `${who} to ${APP_DISPLAY_NAME}!\n\nUse code: ${code}\nJoin here: ${inviteUrl}\n\nScan QR codes at local businesses, earn rewards, and save worldwide.`;
}

export function getWhatsAppInviteUrl(code: string, userName?: string): string {
  return `https://wa.me/?text=${encodeURIComponent(getReferralShareMessage(code, userName))}`;
}

export function getBusinessShareMessage(businessName: string, businessId: string): string {
  return `Discover ${businessName} on ${APP_DISPLAY_NAME}! Scan their QR code, collect stamps, and unlock rewards.\n\n${getAppWebOrigin()}/business/${businessId}`;
}
