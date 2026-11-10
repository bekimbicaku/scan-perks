import assert from 'node:assert/strict';
import {
  isPublicVenueId,
  renderMissingVenueHtml,
  renderVenueHtml,
  renderVenueRequest,
  rewardLine,
  stampCardUrl,
  venueDescription,
  venueIdFromPath,
} from '../lib/server/venuePage.mjs';

const id = 'cafe123';
const link = 'https://scan-perks.com/?utm_source=venue-page&utm_medium=app&utm_campaign=cafe123';

assert.equal(stampCardUrl(id), link);
assert.equal(venueIdFromPath('/business/cafe123'), 'cafe123');
assert.equal(venueIdFromPath('/business/start'), null);
assert.equal(venueIdFromPath('/business/start/'), null);
assert.equal(venueIdFromPath('/home'), null);
assert.equal(isPublicVenueId('start'), false);

const business = {
  name: 'Cafe Roma',
  description: 'Coffee on the corner.',
  type: 'cafe',
  address: { city: 'Durres' },
  email: 'owner@example.com',
  rating: 4.8,
  googleReviewUrl: 'https://example.com/review',
};
const loyalty = { reward: 'A free coffee', scansRequired: 8 };

assert.equal(venueDescription(business), 'Coffee on the corner.');
assert.equal(rewardLine(loyalty), '8 stamps · A free coffee');
assert.equal(rewardLine({ scansRequired: 8 }), '');
assert.equal(rewardLine({ reward: '   ' }), '');
assert.equal(rewardLine(null), '');
assert.equal(
  venueDescription({ name: 'Cafe Roma', type: 'cafe', address: { city: 'Durres' } }),
  'Cafe Roma, cafe in Durres.'
);

const html = renderVenueHtml({
  id,
  business,
  loyalty,
  iosStore: 'https://apps.apple.com/app/id6744923279',
  androidStore: 'https://play.google.com/store/apps/details?id=com.scanperks.app',
});
assert.match(html, /<title>Cafe Roma \| Scan Perks<\/title>/);
assert.match(html, /name="description" content="Coffee on the corner\."/);
assert.match(html, /<h1>Cafe Roma<\/h1>/);
assert.match(html, /<p>Coffee on the corner\.<\/p>/);
assert.match(html, /<p>8 stamps · A free coffee<\/p>/);
assert.ok(
  html.includes(
    `<a href="${link.replace(/&/g, '&amp;')}">Get a stamp card for your business</a>`
  )
);
assert.match(html, /name="robots" content="index, follow"/);
assert.doesNotMatch(html, /review/i);
assert.doesNotMatch(html, /owner@example.com/);
assert.doesNotMatch(html, /4\.8/);
assert.doesNotMatch(html, /noindex/);

const noReward = renderVenueHtml({
  id,
  business: { name: 'Cafe Roma', description: 'Coffee on the corner.' },
  loyalty: { scansRequired: 10 },
  iosStore: 'https://apps.apple.com/app/id6744923279',
  androidStore: 'https://play.google.com/store/apps/details?id=com.scanperks.app',
});
assert.match(noReward, /Coffee on the corner\./);
assert.doesNotMatch(noReward, /stamps/);
assert.doesNotMatch(noReward, /A special reward/);
assert.doesNotMatch(noReward, /A free item/);
assert.doesNotMatch(noReward, /A free coffee/);
assert.match(noReward, /Get a stamp card for your business/);

const namedOnly = renderVenueHtml({
  id,
  business: { name: 'Cafe Roma</title><script>' },
  loyalty: null,
  iosStore: 'https://apps.apple.com/app/id1',
  androidStore: 'https://play.google.com/store/apps/details?id=com.scanperks.app',
});
assert.match(namedOnly, /Cafe Roma&lt;\/title&gt;&lt;script&gt;/);
assert.doesNotMatch(namedOnly, /<script>/);

const missing = renderMissingVenueHtml();
assert.match(missing, /This venue is not live yet\./);
assert.match(missing, /name="robots" content="noindex"/);
assert.doesNotMatch(missing, /Get a stamp card/);
assert.doesNotMatch(missing, /stamps/);
assert.doesNotMatch(missing, /review/i);

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

const venueDoc = {
  fields: {
    name: { stringValue: 'Real Cafe' },
    description: { stringValue: 'Beans from the counter.' },
    email: { stringValue: 'hidden@example.com' },
  },
};
const loyaltyDoc = {
  fields: {
    scansRequired: { integerValue: '6' },
    reward: { stringValue: 'A bun' },
  },
};

let calls = 0;
const fetched = await renderVenueRequest('realCafe1', {
  env: {
    EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'scanperks-cc721',
  },
  fetchImpl: async (url) => {
    calls += 1;
    assert.match(url, /key=test-key/);
    if (url.includes('/settings/loyalty')) return jsonResponse(200, loyaltyDoc);
    return jsonResponse(200, venueDoc);
  },
});
assert.equal(fetched.status, 200);
assert.equal(calls, 2);
assert.match(fetched.html, /<title>Real Cafe \| Scan Perks<\/title>/);
assert.match(fetched.html, /Beans from the counter\./);
assert.match(fetched.html, /6 stamps · A bun/);
assert.match(
  fetched.html,
  /utm_source=venue-page&amp;utm_medium=app&amp;utm_campaign=realCafe1/
);
assert.doesNotMatch(fetched.html, /hidden@example.com/);

const absent = await renderVenueRequest('missingCafe', {
  env: {
    EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'scanperks-cc721',
  },
  fetchImpl: async (url) => {
    if (url.includes('/settings/loyalty')) return jsonResponse(200, loyaltyDoc);
    return jsonResponse(404, {});
  },
});
assert.equal(absent.status, 404);
assert.match(absent.html, /This venue is not live yet\./);
assert.doesNotMatch(absent.html, /A bun/);
assert.equal(absent.robots, 'noindex');

const noLoyalty = await renderVenueRequest('noloyalty1', {
  env: {
    EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'scanperks-cc721',
  },
  fetchImpl: async (url) => {
    if (url.includes('/settings/loyalty')) return jsonResponse(404, {});
    return jsonResponse(200, {
      fields: { name: { stringValue: 'Quiet Cafe' }, type: { stringValue: 'cafe' } },
    });
  },
});
assert.equal(noLoyalty.status, 200);
assert.match(noLoyalty.html, /Quiet Cafe, cafe\./);
assert.doesNotMatch(noLoyalty.html, /stamps/);
assert.doesNotMatch(noLoyalty.html, /A special reward/);
assert.doesNotMatch(noLoyalty.html, /A free item/);

const broken = await renderVenueRequest('brokenCafe', {
  env: {
    EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'scanperks-cc721',
  },
  fetchImpl: async () => jsonResponse(403, {}),
});
assert.equal(broken.status, 503);
assert.match(broken.html, /could not be loaded/);
assert.doesNotMatch(broken.html, /not live yet/);
assert.equal(broken.robots, 'noindex');

console.log('venue page checks passed');
