import { getOwnerIntent } from '@/lib/businessStart';
import { canUsePushNotifications, getPushPermissionStatus } from '@/lib/notifications';
import { hasSeenNotificationsPrompt } from '@/lib/onboarding';

export async function getPostAuthHref(): Promise<'/enable-notifications' | '/home' | '/business'> {
  if (await getOwnerIntent()) {
    return '/business';
  }

  if (!canUsePushNotifications()) {
    return '/home';
  }

  const status = await getPushPermissionStatus();
  if (status === 'granted' || status === 'unsupported') {
    return '/home';
  }

  if (await hasSeenNotificationsPrompt()) {
    return '/home';
  }

  return '/enable-notifications';
}
