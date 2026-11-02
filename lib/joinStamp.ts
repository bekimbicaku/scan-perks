import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { getDb } from './firebase';

export async function creditJoinStamp(ownerId: string, businessName: string) {
  const ownerSnap = await getDoc(doc(getDb(), 'users', ownerId));
  const acquisition = ownerSnap.data()?.acquisition;
  const requestedBy = acquisition?.requestedBy;
  if (typeof requestedBy !== 'string' || !/^[A-Za-z0-9]{10,128}$/.test(requestedBy)) return;
  if (requestedBy === ownerId) return;

  const pendingRef = doc(getDb(), 'users', requestedBy, 'pendingStamps', ownerId);
  const existing = await getDoc(pendingRef);
  if (existing.exists()) return;

  const cafeName = typeof acquisition?.requestedCafe === 'string' ? acquisition.requestedCafe : '';
  await setDoc(pendingRef, {
    businessId: ownerId,
    requesterId: requestedBy,
    stamps: 1,
    applied: false,
    cafeName,
    businessName,
    createdAt: new Date(),
  });
}

export async function claimJoinStamps(userId: string) {
  const pendingSnap = await getDocs(collection(getDb(), 'users', userId, 'pendingStamps'));
  for (const pending of pendingSnap.docs) {
    if (pending.data().applied === true) continue;
    const businessId = pending.id;
    const scanRef = doc(getDb(), 'users', userId, 'scans', businessId);
    const statsRef = doc(getDb(), 'businesses', businessId, 'statistics', 'scans');
    const customerRef = doc(getDb(), 'businesses', businessId, 'customers', userId);

    await runTransaction(getDb(), async (tx) => {
      const fresh = await tx.get(pending.ref);
      if (!fresh.exists() || fresh.data().applied === true) return;
      const scanSnap = await tx.get(scanRef);
      const isNew = !scanSnap.exists();
      const now = new Date();
      tx.set(
        scanRef,
        { businessId, totalScans: increment(1), lastScan: now },
        { merge: true }
      );
      tx.set(
        statsRef,
        {
          totalScans: increment(1),
          uniqueCustomers: increment(isNew ? 1 : 0),
          lastScanAt: now,
        },
        { merge: true }
      );
      tx.set(
        customerRef,
        { userId, totalScans: increment(1), lastScan: now },
        { merge: true }
      );
      tx.update(pending.ref, { applied: true, appliedAt: now });
    });
  }
}
