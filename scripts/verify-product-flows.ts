import assert from 'node:assert/strict';
import { buildCafeRequestRecord, validateCafeName } from '../lib/cafeRequestRecord';
import { buildPrintedQrValue, parseQRData } from '../lib/qrLink';
import {
  buildVenueBillingFields,
  clampTrialDays,
  isTrialExpired,
  isVenueLive,
  remainingTrialDays,
  scanBlockReason,
  trialEndFrom,
  TRIAL_DAYS,
} from '../lib/trial';

const origin = 'https://app.scan-perks.com';
const businessId = 'owner_123';
const printed = buildPrintedQrValue(businessId, origin);

assert.equal(printed, 'https://app.scan-perks.com/business/owner_123');
assert.match(printed, /\/business\/owner_123$/);

const fromLink = parseQRData(printed);
assert.equal(fromLink.businessId, businessId);
assert.equal(fromLink.type, 'static');

const fromJson = parseQRData(
  JSON.stringify({
    businessId,
    type: 'static',
    timestamp: '2020-01-01T00:00:00.000Z',
  })
);
assert.equal(fromJson.businessId, businessId);
assert.equal(fromJson.type, 'static');

const dynamicUrl = new URL(printed);
dynamicUrl.searchParams.set('type', 'dynamic');
dynamicUrl.searchParams.set('transactionId', 'tx_9');
const fromDynamic = parseQRData(dynamicUrl.toString());
assert.equal(fromDynamic.businessId, businessId);
assert.equal(fromDynamic.type, 'dynamic');
assert.equal(fromDynamic.transactionId, 'tx_9');

assert.throws(() => parseQRData('not-a-code'), /Invalid QR code/);
assert.throws(() => parseQRData('{"type":"static"}'), /Invalid QR code format/);

const start = new Date('2026-10-01T00:00:00.000Z');
const trialEnd = trialEndFrom(start);
assert.equal(trialEnd.getTime() - start.getTime(), TRIAL_DAYS * 24 * 60 * 60 * 1000);

const billing = buildVenueBillingFields({ now: start, alreadyPaid: false });
assert.equal(billing.plan, 'basic');
assert.equal(billing.planStatus, 'trial');
assert.equal(billing.isActive, true);
assert.equal(billing.isPremium, false);
assert.equal(billing.trialEndsAt?.toISOString(), trialEnd.toISOString());
assert.equal(scanBlockReason(billing, 0, new Date('2026-10-10T00:00:00.000Z')), null);
assert.match(
  scanBlockReason(billing, 0, new Date('2026-10-15T00:00:00.000Z')) || '',
  /trial has ended/
);
assert.equal(isVenueLive(billing, new Date('2026-10-10T00:00:00.000Z')), true);
assert.equal(isVenueLive(billing, new Date('2026-10-16T00:00:00.000Z')), false);
assert.equal(remainingTrialDays(billing.trialEndsAt, new Date('2026-10-10T00:00:00.000Z')), 5);
assert.equal(isTrialExpired(billing.trialEndsAt, new Date('2026-10-14T23:00:00.000Z')), false);

const paid = buildVenueBillingFields({ now: start, alreadyPaid: true, paidPlan: 'premium' });
assert.equal(paid.planStatus, 'active');
assert.equal(paid.plan, 'premium');
assert.equal(paid.trialEndsAt, null);
assert.equal(scanBlockReason(paid, 0, new Date('2027-01-01T00:00:00.000Z')), null);

assert.equal(clampTrialDays(14), 14);
assert.equal(clampTrialDays(40), 14);
assert.equal(clampTrialDays(0), undefined);
assert.equal(clampTrialDays('nope'), undefined);

assert.equal(validateCafeName('  '), 'Enter the cafe name');
const record = buildCafeRequestRecord({
  userId: 'user_1',
  email: 'ada@example.com',
  userName: 'Ada',
  cafeName: '  Blue Harbor  Cafe ',
  city: 'Durrës',
  now: start,
});
assert.equal(record.cafeName, 'Blue Harbor Cafe');
assert.equal(record.city, 'Durrës');
assert.equal(record.userId, 'user_1');
assert.equal(record.email, 'ada@example.com');

console.log('product flow checks passed');
