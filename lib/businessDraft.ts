import { Platform } from 'react-native';

const DRAFT_KEY_PREFIX = 'scanperks_business_draft_';

export type BusinessDraft = {
  name: string;
  type: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  logoUrl?: string | null;
  plan?: 'basic' | 'premium';
};

export function saveLocalBusinessDraft(userId: string, data: BusinessDraft): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(data);
    window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${userId}`, payload);
    window.sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${userId}`, payload);
  } catch (error) {
    console.warn('[businessDraft] local save failed', error);
  }
}

export function loadLocalBusinessDraft(userId: string): BusinessDraft | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${userId}`) ||
      window.sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BusinessDraft;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalBusinessDraft(userId: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${userId}`);
    window.sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}
