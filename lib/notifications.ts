import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { auth, getDb } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function isPushSupported() {
  return Platform.OS !== 'web' && Device.isDevice && Constants.appOwnership !== 'expo';
}

async function getNotifications() {
  if (!isPushSupported()) return null;
  return import('expo-notifications');
}

export async function registerForPushNotifications() {
  if (!isPushSupported()) return;

  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    if (auth.currentUser) {
      await setDoc(
        doc(getDb(), 'users', auth.currentUser.uid),
        {
          expoPushToken: expoPushToken.data,
          lastTokenUpdate: serverTimestamp(),
          platform: Platform.OS,
          deviceName: Device.deviceName,
        },
        { merge: true }
      );
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('offers', {
        name: 'Offers',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#38BDF8',
      });
    }

    return expoPushToken.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: Record<string, unknown>) {
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
    }),
  });
}
