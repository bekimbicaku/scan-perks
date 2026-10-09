import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, getDb } from './firebase';
import { isFirebaseConfigured } from './firebaseConfig';

const THROTTLE_MS = 15 * 60 * 1000;

let lastUid = '';
let lastWriteAt = 0;

/** Stamp the signed-in user as active. Opening or resuming the app resets the 14-day reengage clock. */
export async function touchLastSeen() {
  if (!isFirebaseConfigured()) return;

  const user = auth.currentUser;
  if (!user) return;

  const now = Date.now();
  if (user.uid === lastUid && now - lastWriteAt < THROTTLE_MS) return;

  lastUid = user.uid;
  lastWriteAt = now;

  try {
    await setDoc(
      doc(getDb(), 'users', user.uid),
      { lastSeenAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    lastWriteAt = 0;
    console.error('touchLastSeen failed', error);
  }
}
