import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app;
let auth;
let db;
let storage;
let analytics;
let messaging;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    
    // Initialize auth based on platform
    if (Platform.OS === 'web') {
      auth = getAuth(app);
      if (typeof window !== 'undefined') {
        // Only set persistence if we're in a browser environment
        setPersistence(auth, browserLocalPersistence).catch(console.error);
        
        // Initialize web-specific services
        isSupported().then(supported => {
          if (supported) {
            analytics = getAnalytics(app);
            messaging = getMessaging(app);
          }
        }).catch(console.error);
      }
    } else {
      // For non-web platforms, use AsyncStorage persistence
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }

    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      messaging = getMessaging(app);
    }
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

export { auth, db, storage, messaging };