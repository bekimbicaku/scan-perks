import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { normalizeCafeName, validateCafeName } from './cafeRequestRecord';
import { getAppWebOrigin } from './referral';

const INTENT_KEY = '@scan_perks_owner_intent';
const GO_LIVE_KEY = (userId: string) => `@scan_perks_golive_${userId}`;

export const STAFF_SENTENCE =
  'Point your phone camera at this code. It opens our Scan Perks card.';

export type OwnerIntent = {
  path: 'business-start';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  from?: string;
  cafe?: string;
};

type SearchValue = string | string[] | undefined;

const UTM_KEYS = ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'] as const;

function clip(value: string): string {
  return value.trim().slice(0, 80);
}

function first(value: SearchValue): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? clip(raw) : '';
}

function cleanUid(value: string): string | undefined {
  return /^[A-Za-z0-9]{10,128}$/.test(value) ? value : undefined;
}

export function intentFromParams(params: {
  utm_source?: SearchValue;
  utm_medium?: SearchValue;
  utm_campaign?: SearchValue;
  utm_content?: SearchValue;
  utm_term?: SearchValue;
  from?: SearchValue;
  cafe?: SearchValue;
}): OwnerIntent {
  const fromWindow = readWindowParams();
  const intent: OwnerIntent = { path: 'business-start' };
  const utmSource = first(params.utm_source) || fromWindow.utmSource || '';
  const utmMedium = first(params.utm_medium) || fromWindow.utmMedium || '';
  const utmCampaign = first(params.utm_campaign) || fromWindow.utmCampaign || '';
  const utmContent = first(params.utm_content) || fromWindow.utmContent || '';
  const utmTerm = first(params.utm_term) || fromWindow.utmTerm || '';
  const from = cleanUid(first(params.from) || fromWindow.from || '');
  const cafeRaw = first(params.cafe) || fromWindow.cafe || '';

  if (utmSource) intent.utmSource = utmSource;
  if (utmMedium) intent.utmMedium = utmMedium;
  if (utmCampaign) intent.utmCampaign = utmCampaign;
  if (utmContent) intent.utmContent = utmContent;
  if (utmTerm) intent.utmTerm = utmTerm;
  if (from) intent.from = from;
  if (cafeRaw && !validateCafeName(cafeRaw)) intent.cafe = normalizeCafeName(cafeRaw);
  return intent;
}

function readWindowParams(): Partial<OwnerIntent> {
  if (typeof window === 'undefined') return {};
  let search: URLSearchParams;
  try {
    search = new URLSearchParams(window.location.search);
  } catch {
    return {};
  }
  const pick = (key: string) => clip(search.get(key) || '');
  const cafeRaw = pick('cafe');
  const from = cleanUid(pick('from'));
  return {
    utmSource: pick('utm_source') || undefined,
    utmMedium: pick('utm_medium') || undefined,
    utmCampaign: pick('utm_campaign') || undefined,
    utmContent: pick('utm_content') || undefined,
    utmTerm: pick('utm_term') || undefined,
    from,
    cafe: cafeRaw && !validateCafeName(cafeRaw) ? normalizeCafeName(cafeRaw) : undefined,
  };
}

export async function getOwnerIntent(): Promise<OwnerIntent | null> {
  try {
    const raw = await AsyncStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OwnerIntent;
    if (parsed?.path !== 'business-start') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveOwnerIntent(incoming: OwnerIntent) {
  const current = (await getOwnerIntent()) || { path: 'business-start' as const };
  const merged: OwnerIntent = { ...current, path: 'business-start' };
  for (const key of UTM_KEYS) {
    const value = incoming[key];
    if (value) merged[key] = value;
  }
  if (incoming.from) merged.from = incoming.from;
  if (incoming.cafe) merged.cafe = incoming.cafe;
  await AsyncStorage.setItem(INTENT_KEY, JSON.stringify(merged));
}

export async function clearOwnerIntent() {
  await AsyncStorage.removeItem(INTENT_KEY);
}

export function acquisitionFields(intent: OwnerIntent) {
  const acquisition: Record<string, string | Date> = {
    path: 'business-start',
    capturedAt: new Date(),
  };
  if (intent.utmSource) acquisition.utmSource = intent.utmSource;
  if (intent.utmMedium) acquisition.utmMedium = intent.utmMedium;
  if (intent.utmCampaign) acquisition.utmCampaign = intent.utmCampaign;
  if (intent.utmContent) acquisition.utmContent = intent.utmContent;
  if (intent.utmTerm) acquisition.utmTerm = intent.utmTerm;
  if (intent.from) acquisition.requestedBy = intent.from;
  if (intent.cafe) acquisition.requestedCafe = intent.cafe;
  return {
    accountIntent: 'business' as const,
    acquisition,
  };
}

export async function persistOwnerAcquisition(userId: string): Promise<string> {
  const intent = await getOwnerIntent();
  const userRef = doc(getDb(), 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};
  const existingCafe =
    typeof data?.acquisition?.requestedCafe === 'string' ? data.acquisition.requestedCafe : '';

  if (!intent) return existingCafe;

  if (data?.acquisition?.path !== 'business-start') {
    await setDoc(userRef, acquisitionFields(intent), { merge: true });
  }
  await clearOwnerIntent();
  return intent.cafe || existingCafe;
}

export function buildBusinessStartUrl(input: { from: string; cafe: string }) {
  const params = new URLSearchParams();
  params.set('from', input.from);
  params.set('cafe', input.cafe);
  return `${getAppWebOrigin()}/business/start?${params.toString()}`;
}

export function askCafeMessage(cafe: string, link: string) {
  return `Can you put a Scan Perks stamp card on the counter at ${cafe}? Setup is in the app. 14 days free, no card. ${link}`;
}

export function customerPost(input: {
  name: string;
  scansRequired: number;
  reward: string;
  url: string;
}) {
  return `${input.name} has a stamp card on Scan Perks. ${input.scansRequired} stamps, then ${input.reward}. Point your camera at the code on our counter.\n${input.url}`;
}

export function whatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function loadGoLiveFlags(userId: string): Promise<{ printed: boolean; shared: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(GO_LIVE_KEY(userId));
    if (!raw) return { printed: false, shared: false };
    const parsed = JSON.parse(raw);
    return { printed: parsed.printed === true, shared: parsed.shared === true };
  } catch {
    return { printed: false, shared: false };
  }
}

export async function markGoLive(userId: string, flag: 'printed' | 'shared') {
  const current = await loadGoLiveFlags(userId);
  current[flag] = true;
  await AsyncStorage.setItem(GO_LIVE_KEY(userId), JSON.stringify(current));
}
