import { app, auth } from './firebaseAuth';
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

function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }
  return storageInstance;
}

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!isFirebaseConfigured()) {
      return undefined;
    }
    const instance = getDb();
    const value = (instance as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    if (!isFirebaseConfigured()) {
      return undefined;
    }
    const instance = getStorageInstance();
    const value = (instance as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export async function deleteBusiness(businessId: string) {
  const batch = writeBatch(getDb());

  const subcollections = ['offers', 'qr_codes', 'statistics', 'settings', 'analytics'];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(getDb(), 'businesses', businessId, sub));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  batch.delete(doc(getDb(), 'businesses', businessId));
  await batch.commit();
}
