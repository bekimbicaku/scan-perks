import { getAppInstance } from './firebaseAuth';
import { isFirebaseConfigured } from './firebaseConfig';

export {
  auth,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from './firebaseAuth';

import {
  collection,
  doc,
  Firestore,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function ensureDb(): Firestore {
  if (!dbInstance) {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    dbInstance = getFirestore(getAppInstance());
  }
  return dbInstance;
}

function ensureStorage(): FirebaseStorage {
  if (!storageInstance) {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    storageInstance = getStorage(getAppInstance());
  }
  return storageInstance;
}

function createFirebaseProxy<T extends object>(getInstance: () => T) {
  return new Proxy({} as T, {
    get(_target, prop) {
      if (!isFirebaseConfigured() || typeof window === 'undefined') {
        return undefined;
      }
      const instance = getInstance();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
    },
  });
}

export const db = createFirebaseProxy(ensureDb);
export const storage = createFirebaseProxy(ensureStorage);

export async function deleteBusiness(businessId: string) {
  const firestore = ensureDb();
  const batch = writeBatch(firestore);

  const subcollections = ['offers', 'qr_codes', 'statistics', 'settings', 'analytics'];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(firestore, 'businesses', businessId, sub));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  batch.delete(doc(firestore, 'businesses', businessId));
  await batch.commit();
}
