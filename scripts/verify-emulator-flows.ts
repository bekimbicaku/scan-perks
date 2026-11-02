import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { buildCafeRequestRecord } from '../lib/cafeRequestRecord';
import { buildPrintedQrValue, parseQRData } from '../lib/qrLink';
import { buildVenueBillingFields, scanBlockReason } from '../lib/trial';

const app = initializeApp({
  apiKey: 'demo',
  authDomain: 'localhost',
  projectId: 'scanperks-cc721',
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function main() {
const email = `trial-${Date.now()}@example.com`;
const password = 'secret12';
const credential = await createUserWithEmailAndPassword(auth, email, password);
const userId = credential.user.uid;

await setDoc(doc(db, 'users', userId), {
  name: 'Ada',
  email,
  createdAt: new Date(),
});

const cafe = buildCafeRequestRecord({
  userId,
  email,
  userName: 'Ada',
  cafeName: 'Blue Harbor Cafe',
  city: 'Durrës',
});
await setDoc(doc(db, 'cafeRequests', userId), cafe);
await setDoc(
  doc(db, 'users', userId),
  { usualCafe: cafe.cafeName, usualCafeCity: cafe.city, usualCafeAt: cafe.updatedAt },
  { merge: true }
);

const now = new Date();
const billing = buildVenueBillingFields({ now, alreadyPaid: false });
const qrUrl = buildPrintedQrValue(userId, 'https://app.scan-perks.com');
await setDoc(doc(db, 'businesses', userId), {
  name: 'Harbor Coffee',
  type: 'Cafe',
  email,
  phone: '',
  address: { street: '1 Port', city: 'Durrës', postalCode: '' },
  qrType: 'static',
  qrUrl,
  plan: billing.plan,
  planStatus: billing.planStatus,
  isActive: true,
  isPremium: false,
  planStartDate: now,
  trialStartedAt: billing.trialStartedAt,
  trialEndsAt: billing.trialEndsAt,
  ownerId: userId,
  createdAt: now,
  updatedAt: now,
});
await setDoc(doc(db, 'businesses', userId, 'settings', 'loyalty'), {
  scansRequired: 8,
  reward: 'Free coffee',
  welcomeStampEnabled: true,
  lastModified: now,
});

const savedCafe = await getDoc(doc(db, 'cafeRequests', userId));
const savedBusiness = await getDoc(doc(db, 'businesses', userId));
const savedUser = await getDoc(doc(db, 'users', userId));
const business = savedBusiness.data() || {};

if (savedCafe.data()?.cafeName !== 'Blue Harbor Cafe') {
  throw new Error('cafe request was not stored');
}
if (savedUser.data()?.usualCafe !== 'Blue Harbor Cafe') {
  throw new Error('usual cafe was not stored on the user');
}
if (business.planStatus !== 'trial' || business.plan !== 'basic' || business.isActive !== true) {
  throw new Error(`trial business was not stored: ${JSON.stringify(business)}`);
}
if (business.stripeCustomerId || business.stripeSubscriptionId || savedUser.data()?.subscribed) {
  throw new Error('trial venue wrote a card or subscription');
}
if (typeof business.qrUrl !== 'string' || !business.qrUrl.includes(`/business/${userId}`)) {
  throw new Error(`QR is not a business link: ${business.qrUrl}`);
}
const parsed = parseQRData(String(business.qrUrl));
if (parsed.businessId !== userId) {
  throw new Error('scanner could not read the link QR');
}
const oldJson = parseQRData(JSON.stringify({ businessId: userId, type: 'static', timestamp: now.toISOString() }));
if (oldJson.businessId !== userId) {
  throw new Error('scanner rejected the old JSON QR');
}
if (scanBlockReason(business, 0, now)) {
  throw new Error('trial QR would be blocked');
}

await signOut(auth);
console.log(JSON.stringify({
  ok: true,
  userId,
  cafe: savedCafe.data()?.cafeName,
  planStatus: business.planStatus,
  qrUrl: business.qrUrl,
  subscribed: savedUser.data()?.subscribed ?? false,
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
