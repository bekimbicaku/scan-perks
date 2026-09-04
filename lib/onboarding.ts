import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SEEN_KEY = '@scan_perks_welcome_seen';
const PENDING_REFERRAL_KEY = '@scan_perks_pending_referral';
const NOTIFICATIONS_PROMPT_KEY = '@scan_perks_notifications_prompt_seen';
const DOWNLOAD_BANNER_KEY = '@scan_perks_download_banner_dismissed';

export async function hasSeenWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markWelcomeSeen() {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
    return value?.trim() ? value.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export async function setPendingReferralCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, normalized);
}

export async function clearPendingReferralCode() {
  await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
}

export async function hasSeenNotificationsPrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NOTIFICATIONS_PROMPT_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markNotificationsPromptSeen() {
  await AsyncStorage.setItem(NOTIFICATIONS_PROMPT_KEY, '1');
}

export async function hasDismissedDownloadBanner(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DOWNLOAD_BANNER_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markDownloadBannerDismissed() {
  await AsyncStorage.setItem(DOWNLOAD_BANNER_KEY, '1');
}
