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

export let db: Firestore = undefined as unknown as Firestore;
export let storage: FirebaseStorage = undefined as unknown as FirebaseStorage;

export function ensureFirebaseServices(): void {
  if (db) {
    return;
  }

  if (!isFirebaseConfigured()) {
    return;
  }

  const appInstance = getAppInstance();
  db = getFirestore(appInstance);
  storage = getStorage(appInstance);
}

export function getDb(): Firestore {
  ensureFirebaseServices();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  return db;
}

export function getStorageInstance(): FirebaseStorage {
  ensureFirebaseServices();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }
  return storage;
}

if (typeof window !== 'undefined') {
  ensureFirebaseServices();
}

export async function deleteBusiness(businessId: string) {
  const firestore = getDb();
  const batch = writeBatch(firestore);

  const subcollections = ['offers', 'qr_codes', 'statistics', 'settings', 'analytics'];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(firestore, 'businesses', businessId, sub));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  batch.delete(doc(firestore, 'businesses', businessId));
  await batch.commit();
}
