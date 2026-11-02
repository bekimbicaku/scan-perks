import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, getDb } from './firebase';
import { buildCafeRequestRecord, type CafeRequestRecord } from './cafeRequestRecord';
import { LAUNCH_CITY } from './launchCity';

export async function loadUsualCafe(userId: string): Promise<string> {
  const requestSnap = await getDoc(doc(getDb(), 'cafeRequests', userId));
  if (requestSnap.exists()) {
    const name = requestSnap.data().cafeName;
    if (typeof name === 'string' && name.trim()) return name;
  }

  const userSnap = await getDoc(doc(getDb(), 'users', userId));
  const usual = userSnap.data()?.usualCafe;
  return typeof usual === 'string' ? usual : '';
}

export async function saveUsualCafe(userId: string, cafeName: string, city = LAUNCH_CITY): Promise<CafeRequestRecord> {
  const userRef = doc(getDb(), 'users', userId);
  const [userSnap, existingRequest] = await Promise.all([
    getDoc(userRef),
    getDoc(doc(getDb(), 'cafeRequests', userId)),
  ]);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const existingCreated = existingRequest.exists() ? existingRequest.data().createdAt : undefined;
  const createdAt =
    existingCreated && typeof existingCreated.toDate === 'function'
      ? existingCreated.toDate()
      : existingCreated instanceof Date
        ? existingCreated
        : undefined;

  const record = buildCafeRequestRecord({
    userId,
    email: (typeof userData.email === 'string' && userData.email) || auth.currentUser?.email || '',
    userName: typeof userData.name === 'string' ? userData.name : '',
    cafeName,
    city,
    createdAt,
  });

  await setDoc(doc(getDb(), 'cafeRequests', userId), record, { merge: true });
  await setDoc(
    userRef,
    {
      usualCafe: record.cafeName,
      usualCafeCity: record.city,
      usualCafeAt: record.updatedAt,
    },
    { merge: true }
  );

  return record;
}
