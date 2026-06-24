import { app, auth } from './firebaseAuth';

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

import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const db = getFirestore(app);
const storage = getStorage(app);

export async function deleteBusiness(businessId: string) {
  const batch = writeBatch(db);

  const subcollections = ['offers', 'qr_codes', 'statistics', 'settings', 'analytics'];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'businesses', businessId, sub));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  batch.delete(doc(db, 'businesses', businessId));
  await batch.commit();
}

export { db, storage };
