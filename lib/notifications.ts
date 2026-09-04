import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { auth, getDb } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getExpoProjectId } from './expoProjectId';

export type PushPermissionStatus = 'unsupported' | 'undetermined' | 'denied' | 'granted';

function isPushSupported() {
  return Platform.OS !== 'web' && Device.isDevice && Constants.appOwnership !== 'expo';
}

async function getNotifications() {
  if (!isPushSupported()) return null;
  return import('expo-notifications');
}

export function canUsePushNotifications() {
  return isPushSupported();
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) return 'unsupported';

  try {
    const Notifications = await getNotifications();
    if (!Notifications) return 'unsupported';
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

async function savePushToken(token: string) {
  if (!auth.currentUser) return;

  await setDoc(
    doc(getDb(), 'users', auth.currentUser.uid),
    {
      expoPushToken: token,
      lastTokenUpdate: serverTimestamp(),
      platform: Platform.OS,
      deviceName: Device.deviceName,
      notificationsEnabled: true,
    },
    { merge: true }
  );
}

async function ensureAndroidChannel(
  Notifications: typeof import('expo-notifications')
) {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('offers', {
    name: 'Offers',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#38BDF8',
  });
}

export async function registerForPushNotifications(options?: { request?: boolean }) {
  if (!isPushSupported()) return;

  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      if (options?.request === false) return;
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    await ensureAndroidChannel(Notifications);

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: getExpoProjectId(),
    });

    await savePushToken(expoPushToken.data);
    return expoPushToken.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}

export async function enablePushNotifications() {
  return registerForPushNotifications({ request: true });
}

export async function syncPushTokenIfGranted() {
  return registerForPushNotifications({ request: false });
}

export async function openSystemNotificationSettings() {
  await Linking.openSettings();
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: 'offers',
    }),
  });
}

export async function configurePushNotifications() {
  if (!isPushSupported()) return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
