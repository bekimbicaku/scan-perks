import fs from 'node:fs';
import path from 'node:path';

const APP_ORIGIN = 'https://app.scan-perks.com';
const MARKETING_ORIGIN = 'https://scan-perks.com/';
const IOS_STORE = 'https://apps.apple.com/app/id6744923279';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.scanperks.app';

const VENUE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isPublicVenueId(id) {
  return typeof id === 'string' && id !== 'start' && VENUE_ID.test(id);
}

export function venueIdFromPath(pathname) {
  const match = pathname.match(/^\/business\/([^/]+)\/?$/);
  if (!match) return null;
  let id;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return isPublicVenueId(id) ? id : null;
}

export function stampCardUrl(venueId) {
  const url = new URL(MARKETING_ORIGIN);
  url.searchParams.set('utm_source', 'venue-page');
  url.searchParams.set('utm_medium', 'app');
  url.searchParams.set('utm_campaign', venueId);
  return url.toString();
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function venueDescription(business) {
  const written = text(business && business.description);
  if (written) return written;
  const name = text(business && business.name);
  const type = text(business && business.type);
  const city = text(business && business.address && business.address.city);
  if (name && type && city) return `${name}, ${type} in ${city}.`;
  if (name && type) return `${name}, ${type}.`;
  if (name && city) return `${name} in ${city}.`;
  if (name) return `${name}.`;
  return '';
}

export function rewardLine(loyalty) {
  const reward = text(loyalty && loyalty.reward);
  if (!reward) return '';
  const count = loyalty.scansRequired;
  if (typeof count === 'number' && Number.isInteger(count) && count > 0) {
    return `${count} stamps · ${reward}`;
  }
  return reward;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page({ title, description, robots, canonical, body }) {
  const canonicalTag = canonical
    ? `<link rel="canonical" href="${escapeHtml(canonical)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${robots}">
${canonicalTag}
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

export function renderVenueHtml({ id, business, loyalty, iosStore, androidStore }) {
  const name = text(business.name);
  const description = venueDescription(business);
  const reward = rewardLine(loyalty);
  const title = name ? `${name} | Scan Perks` : 'Scan Perks';
  const href = stampCardUrl(id);
  const parts = [];
  if (name) parts.push(`<h1>${escapeHtml(name)}</h1>`);
  if (description) parts.push(`<p>${escapeHtml(description)}</p>`);
  if (reward) parts.push(`<p>${escapeHtml(reward)}</p>`);
  parts.push(
    `<p><a href="${escapeHtml(href)}">Get a stamp card for your business</a></p>`
  );
  parts.push(
    `<p><a href="${escapeHtml(iosStore)}">App Store</a> · <a href="${escapeHtml(androidStore)}">Google Play</a></p>`
  );
  return page({
    title,
    description: description || title,
    robots: 'index, follow',
    canonical: `${APP_ORIGIN}/business/${encodeURIComponent(id)}`,
    body: parts.join('\n'),
  });
}

export function renderMissingVenueHtml() {
  const message = 'This venue is not live yet.';
  return page({
    title: message,
    description: message,
    robots: 'noindex',
    body: `<h1>${escapeHtml(message)}</h1>`,
  });
}

function renderUnavailableHtml() {
  const message = 'This venue could not be loaded.';
  return page({
    title: message,
    description: message,
    robots: 'noindex',
    body: `<h1>${escapeHtml(message)}</h1>`,
  });
}

function decodeFields(fields) {
  const data = {};
  for (const [key, field] of Object.entries(fields || {})) {
    data[key] = decodeValue(field);
  }
  return data;
}

function decodeValue(field) {
  if (!field || typeof field !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(field, 'stringValue')) return field.stringValue;
  if (Object.prototype.hasOwnProperty.call(field, 'integerValue')) return Number(field.integerValue);
  if (Object.prototype.hasOwnProperty.call(field, 'doubleValue')) return Number(field.doubleValue);
  if (Object.prototype.hasOwnProperty.call(field, 'booleanValue')) return field.booleanValue;
  if (field.mapValue) return decodeFields(field.mapValue.fields || {});
  return undefined;
}

function parseEnvFile(contents) {
  const env = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function productionEnv() {
  // Vercel bundles this middleware to CommonJS, where import.meta.url is empty.
  // A URL built from it throws before any file is read and the invocation fails.
  try {
    const file = path.join(process.cwd(), '.env.production');
    return parseEnvFile(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function firebaseSettings(env) {
  const fileEnv = productionEnv();
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY || fileEnv.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || fileEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    projectId,
    iosStore: env.EXPO_PUBLIC_IOS_STORE_URL || fileEnv.EXPO_PUBLIC_IOS_STORE_URL || IOS_STORE,
    androidStore:
      env.EXPO_PUBLIC_ANDROID_STORE_URL || fileEnv.EXPO_PUBLIC_ANDROID_STORE_URL || ANDROID_STORE,
  };
}

async function readDocument(projectId, apiKey, documentPath, fetchImpl) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(url, {
    headers: { Referer: `${APP_ORIGIN}/` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Firestore ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const body = await response.json();
  return decodeFields(body.fields || {});
}

export async function renderVenueRequest(id, deps = {}) {
  if (!isPublicVenueId(id)) {
    return { status: 404, html: renderMissingVenueHtml(), robots: 'noindex' };
  }

  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || fetch;
  const settings = firebaseSettings(env);
  if (!settings) {
    return { status: 503, html: renderUnavailableHtml(), robots: 'noindex' };
  }

  try {
    const business = await readDocument(
      settings.projectId,
      settings.apiKey,
      `businesses/${encodeURIComponent(id)}`,
      fetchImpl
    );
    if (!business) {
      return { status: 404, html: renderMissingVenueHtml(), robots: 'noindex' };
    }
    const loyalty = await readDocument(
      settings.projectId,
      settings.apiKey,
      `businesses/${encodeURIComponent(id)}/settings/loyalty`,
      fetchImpl
    );
    return {
      status: 200,
      robots: 'index, follow',
      html: renderVenueHtml({
        id,
        business,
        loyalty,
        iosStore: settings.iosStore,
        androidStore: settings.androidStore,
      }),
    };
  } catch {
    return { status: 503, html: renderUnavailableHtml(), robots: 'noindex' };
  }
}
