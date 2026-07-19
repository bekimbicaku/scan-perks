import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

export {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
};

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured for this build.');
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function createAuth(app: FirebaseApp): Auth {
  const webAuth = getAuth(app);
  setPersistence(webAuth, browserLocalPersistence).catch(console.error);
  return webAuth;
}

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;

function canInitAuth(): boolean {
  return typeof window !== 'undefined';
}

export function getAppInstance(): FirebaseApp {
  if (!appInstance) {
    appInstance = getFirebaseApp();
  }
  return appInstance;
}

export function getAuthInstance(): Auth {
  if (!authInstance) {
    if (!canInitAuth()) {
      throw new Error('Firebase Auth is not available during server rendering');
    }
    authInstance = createAuth(getAppInstance());
  }
  return authInstance;
}

export const app: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    if (!isFirebaseConfigured() || !canInitAuth()) {
      return undefined;
    }
    const instance = getAppInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!isFirebaseConfigured() || !canInitAuth()) {
      return undefined;
    }
    const instance = getAuthInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
