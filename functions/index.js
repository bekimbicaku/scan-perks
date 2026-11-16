const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const express = require("express");
const cors = require('cors')({ origin: true });

admin.initializeApp();

function getStripeSecretKey() {
  const fromConfig =
    functions.config().stripe && functions.config().stripe.secret
      ? functions.config().stripe.secret
      : '';
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY ||
    fromConfig ||
    ''
  );
}

function getStripeWebhookSecret() {
  const fromConfig =
    functions.config().stripe && functions.config().stripe.webhooksecret
      ? functions.config().stripe.webhooksecret
      : '';
  return (
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.EXPO_PUBLIC_STRIPE_WEBHOOK_SECRET ||
    fromConfig ||
    ''
  );
}

const stripe = Stripe(getStripeSecretKey());
const app = express();

app.use(cors);
// Do NOT use express.json() here — it breaks Stripe signature verification.
// Firebase Functions already provides req.rawBody as a Buffer.

// Send notifications when a new offer is created
exports.sendOfferNotification = functions.firestore
  .document('businesses/{businessId}/offers/{offerId}')
  .onCreate(async (snap, context) => {
    const { businessId } = context.params;
    const offer = snap.data();

    try {
      // Get business details
      const businessDoc = await admin.firestore()
        .collection('businesses')
        .doc(businessId)
        .get();

      if (!businessDoc.exists) {
        console.error('Business not found');
        return;
      }

      const businessData = businessDoc.data();

      // Get all users who have scanned this business
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .get();

      const tokens = [];

      for (const userDoc of usersSnapshot.docs) {
        const scanDoc = await admin.firestore()
          .collection('users')
          .doc(userDoc.id)
          .collection('scans')
          .doc(businessId)
          .get();

        if (!scanDoc.exists) continue;

        const userData = userDoc.data();
        if (userData.expoPushToken) {
          tokens.push(userData.expoPushToken);
        }
      }

      if (tokens.length === 0) {
        console.log('No users to notify');
        return;
      }

      // Prepare notification message
      const message = {
        notification: {
          title: `New Offer from ${businessData.name}`,
          body: offer.title,
        },
        data: {
          businessId,
          offerId: context.params.offerId,
          type: 'new_offer',
        },
        android: {
          notification: {
            channelId: 'offers',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens,
      };

      // Send notifications in batches of 500 (FCM limit)
      const chunks = tokens.reduce((acc, token, i) => {
        const chunkIndex = Math.floor(i / 500);
        if (!acc[chunkIndex]) acc[chunkIndex] = [];
        acc[chunkIndex].push(token);
        return acc;
      }, []);

      const results = await Promise.all(
        chunks.map(chunk => 
          admin.messaging().sendMulticast({
            ...message,
            tokens: chunk,
          })
        )
      );

      const successCount = results.reduce((acc, result) => acc + result.successCount, 0);
      const failureCount = results.reduce((acc, result) => acc + result.failureCount, 0);

      console.log(`Successfully sent ${successCount} notifications`);
      if (failureCount > 0) {
        console.error(`Failed to send ${failureCount} notifications`);
      }

      // Update offer statistics
      await admin.firestore()
        .collection('businesses')
        .doc(businessId)
        .collection('offers')
        .doc(context.params.offerId)
        .update({
          notificationsSent: successCount,
          notificationsFailed: failureCount,
          notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  });

function resolvePlanFromSession(session) {
  if (session.metadata?.plan === 'premium' || session.metadata?.plan === 'basic') {
    return session.metadata.plan;
  }
  // Starter is $10 → 1000 cents
  if (session.amount_total === 1000) {
    return 'basic';
  }
  return 'premium';
}

function resolveUserIdFromSession(session) {
  return (
    session.client_reference_id ||
    session.metadata?.firebaseUid ||
    null
  );
}

async function activateSubscriptionFromSession(session) {
  const userId = resolveUserIdFromSession(session);
  if (!userId) {
    throw new Error('Checkout session is missing client_reference_id / firebaseUid');
  }

  const planType = resolvePlanFromSession(session);

  await admin.firestore().collection('users').doc(userId).set(
    {
      subscribed: true,
      plan: planType,
      planStatus: 'active',
      lastPayment: admin.firestore.FieldValue.serverTimestamp(),
      nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: session.customer || null,
      stripeSubscriptionId: session.subscription || null,
      stripeCheckoutSessionId: session.id || null,
      onboardingStep: 'qr-type',
    },
    { merge: true }
  );

  // Only upgrade an existing business profile. Do NOT create an empty business
  // doc — that breaks onboarding (form wiped / incomplete dashboard).
  const businessRef = admin.firestore().collection('businesses').doc(userId);
  const businessSnap = await businessRef.get();
  if (businessSnap.exists) {
    const existing = businessSnap.data() || {};
    if (existing.name && existing.ownerId) {
      await businessRef.set(
        {
          plan: planType,
          planStatus: 'active',
          isActive: true,
          isPremium: planType === 'premium',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  return { userId, planType };
}

// Stripe webhook handler
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = getStripeWebhookSecret();
  const payload = req.rawBody;

  if (!webhookSecret) {
    console.error("[stripeWebhook] STRIPE_WEBHOOK_SECRET / functions.config().stripe.webhooksecret is missing");
    return res.status(500).send("Webhook secret not configured");
  }

  if (!sig) {
    return res.status(400).send("Webhook Error: Missing stripe-signature header");
  }

  if (!payload) {
    console.error("[stripeWebhook] Missing req.rawBody — cannot verify Stripe signature");
    return res.status(400).send("Webhook Error: Missing raw body");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error("[stripeWebhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await activateSubscriptionFromSession(event.data.object);
        break;

      case "customer.subscription.created":
        // Activation is handled on checkout.session.completed; acknowledge these events.
        break;

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        // Persist paid invoice amounts so admin can show real all-time revenue from Firestore.
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const amountPaid = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0;
        if (customerId && amountPaid > 0) {
          const usersSnapshot = await admin
            .firestore()
            .collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            await usersSnapshot.docs[0].ref.set(
              {
                lifetimePaidCents: admin.firestore.FieldValue.increment(amountPaid),
                lastInvoicePaidAt: admin.firestore.FieldValue.serverTimestamp(),
                lastInvoiceId: invoice.id || null,
              },
              { merge: true }
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const usersSnapshot = await admin
          .firestore()
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;

          await userDoc.ref.set(
            {
              subscribed: false,
              planStatus: "cancelled",
              subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const businessRef = admin.firestore().collection("businesses").doc(userId);
          const businessSnap = await businessRef.get();
          if (businessSnap.exists) {
            await businessRef.set(
              {
                isActive: false,
                deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                subscriptionStatus: "cancelled",
              },
              { merge: true }
            );

            const qrCodesSnapshot = await businessRef.collection("qr_codes").get();
            if (!qrCodesSnapshot.empty) {
              const batch = admin.firestore().batch();
              qrCodesSnapshot.docs.forEach((qrDoc) => {
                batch.update(qrDoc.ref, {
                  isActive: false,
                  deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              });
              await batch.commit();
            }
          }
        }
        break;
      }

      default:
        console.log("[stripeWebhook] Unhandled event type:", event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[stripeWebhook] Handler error:", err.message);
    return res.status(500).send(`Webhook handler error: ${err.message}`);
  }
});

exports.stripeWebhook = functions
  .region('europe-west1')
  .https.onRequest(app);

exports.createBillingPortalSession = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const returnUrl =
          typeof req.body?.returnUrl === 'string' && req.body.returnUrl.startsWith('http')
            ? req.body.returnUrl
            : 'https://scanperks.app/business';

        const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
        if (!userDoc.exists) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data() || {};
        let stripeCustomerId = userData.stripeCustomerId;

        if (!stripeCustomerId && decoded.email) {
          const customers = await stripe.customers.list({ email: decoded.email, limit: 1 });
          stripeCustomerId = customers.data[0]?.id;
        }

        if (!stripeCustomerId && decoded.email && userData.subscribed) {
          const customer = await stripe.customers.create({
            email: decoded.email,
            metadata: { firebaseUid: decoded.uid },
          });
          stripeCustomerId = customer.id;
        }

        if (!stripeCustomerId) {
          return res.status(400).json({
            error:
              'No Stripe billing profile found. Subscribe first, then manage billing from here.',
          });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: returnUrl,
        });

        return res.json({ url: session.url });
      } catch (error) {
        console.error('Error creating billing portal session:', error);
        return res.status(500).json({
          error: error.message || 'Failed to create billing portal session',
        });
      }
    });
  });
const STRIPE_PRODUCT_IDS = {
  basic: process.env.EXPO_PUBLIC_STRIPE_PRODUCT_STARTER || 'prod_UuhFUxyxEZPENE',
  premium: process.env.EXPO_PUBLIC_STRIPE_PRODUCT_GROWTH || 'prod_UuhGlzjSeNaCwR',
};

async function getActivePriceId(productId) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });
  const recurring = prices.data.find((price) => price.type === 'recurring') || prices.data[0];
  if (!recurring || !recurring.id) {
    throw new Error('No active Stripe price found for product ' + productId);
  }
  return recurring.id;
}

exports.createCheckoutSession = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const plan = req.body && req.body.plan === 'premium' ? 'premium' : 'basic';
        const productId = STRIPE_PRODUCT_IDS[plan];
        const priceId = await getActivePriceId(productId);
        const requestedTrial = Number(req.body && req.body.trialDays);
        const trialDays =
          Number.isFinite(requestedTrial) && requestedTrial >= 1
            ? Math.min(14, Math.floor(requestedTrial))
            : 0;

        const successUrl =
          req.body && typeof req.body.successUrl === 'string' && req.body.successUrl.startsWith('http')
            ? req.body.successUrl
            : 'https://app.scan-perks.com/payment-success';
        const cancelUrl =
          req.body && typeof req.body.cancelUrl === 'string' && req.body.cancelUrl.startsWith('http')
            ? req.body.cancelUrl
            : 'https://app.scan-perks.com/payment-cancelled';

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl.indexOf('{CHECKOUT_SESSION_ID}') >= 0
            ? successUrl
            : successUrl + (successUrl.indexOf('?') >= 0 ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancelUrl,
          client_reference_id: decoded.uid,
          customer_email: decoded.email || undefined,
          metadata: {
            firebaseUid: decoded.uid,
            plan: plan,
            productId: productId,
          },
          subscription_data: {
            ...(trialDays >= 1 ? { trial_period_days: trialDays } : {}),
            metadata: {
              firebaseUid: decoded.uid,
              plan: plan,
              productId: productId,
            },
          },
          allow_promotion_codes: true,
        });

        if (!session.url) {
          return res.status(500).json({ error: 'Stripe did not return a checkout URL' });
        }

        return res.json({
          url: session.url,
          sessionId: session.id,
          plan: plan,
          productId: productId,
          priceId: priceId,
        });
      } catch (error) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({
          error: error.message || 'Failed to create checkout session',
        });
      }
    });
  });

/**
 * Called from /payment-success after Stripe redirects back with session_id.
 * Confirms the Checkout Session with Stripe and activates the plan immediately
 * (does not wait for the webhook).
 */
exports.verifyCheckoutSession = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const sessionId =
          typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';

        if (!sessionId || !sessionId.startsWith('cs_')) {
          return res.status(400).json({ error: 'Valid sessionId is required' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const sessionUserId = resolveUserIdFromSession(session);

        if (!sessionUserId || sessionUserId !== decoded.uid) {
          return res.status(403).json({ error: 'Checkout session does not belong to this user' });
        }

        const paid =
          session.payment_status === 'paid' ||
          session.status === 'complete';

        if (!paid) {
          return res.json({
            ok: false,
            status: session.status,
            paymentStatus: session.payment_status,
          });
        }

        const { planType } = await activateSubscriptionFromSession(session);

        return res.json({
          ok: true,
          plan: planType,
          paymentId: session.subscription || session.id,
          paymentStatus: session.payment_status,
        });
      } catch (error) {
        console.error('Error verifying checkout session:', error);
        return res.status(500).json({
          error: error.message || 'Failed to verify checkout session',
        });
      }
    });
  });

const reengage = require('./reengage');
exports.reengageInactiveUsers = reengage.reengageInactiveUsers;

const DEFAULT_ADMIN_EMAILS = ['bekimbicaku4@gmail.com'];

function getPlatformAdminEmails() {
  const fromEnv = String(
    process.env.ADMIN_EMAILS ||
      process.env.EXPO_PUBLIC_ADMIN_EMAILS ||
      (functions.config().admin && functions.config().admin.emails) ||
      ''
  )
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

function isPlatformAdminToken(decoded) {
  if (decoded.admin === true) return true;
  const email = decoded.email ? String(decoded.email).trim().toLowerCase() : '';
  return email && getPlatformAdminEmails().includes(email);
}

async function deleteQueryInBatches(queryRef) {
  const snap = await queryRef.get();
  if (snap.empty) return 0;

  let deleted = 0;
  let batch = admin.firestore().batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = admin.firestore().batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  return deleted;
}

async function deactivateOwnedBusiness(userId) {
  const businessRef = admin.firestore().collection('businesses').doc(userId);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) return false;

  await businessRef.set(
    {
      isActive: false,
      deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deactivatedReason: 'platform_admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

function getResendConfig() {
  let legacy = {};
  try {
    legacy = functions.config().reengage || {};
  } catch (error) {
    legacy = {};
  }
  return {
    resendKey: process.env.RESEND_API_KEY || legacy.resend_api_key || '',
    resendFrom: process.env.RESEND_FROM || legacy.resend_from || '',
    appName: process.env.APP_NAME || legacy.app_name || 'Scan Perks',
    appUrl: (process.env.APP_URL || legacy.app_url || 'https://app.scan-perks.com').replace(/\/$/, ''),
  };
}

async function sendExpoPushToken(token, title, body, data) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: 'offers',
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message || `Expo push failed (${response.status})`);
  }
  const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  if (ticket && ticket.status === 'error') {
    throw new Error(ticket.message || 'Expo push ticket error');
  }
}

async function sendPromoResendEmail(config, to, name, title, body) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = [greeting, '', body, '', `Open Scan Perks: ${config.appUrl}`, '', `— ${config.appName}`].join(
    '\n'
  );
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to: [to],
      subject: title,
      text,
    }),
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend failed (${response.status}): ${payload.slice(0, 300)}`);
  }
}

async function applySubscriptionPriceOverride({
  businessId,
  amountUsd,
  months,
  adminUid,
}) {
  if (!getStripeSecretKey()) {
    throw new Error('Stripe secret not configured on functions');
  }

  const businessRef = admin.firestore().collection('businesses').doc(businessId);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) {
    throw new Error('Business not found');
  }
  const business = businessSnap.data() || {};
  const ownerId = business.ownerId || businessId;
  const userRef = admin.firestore().collection('users').doc(ownerId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error('Business owner not found');
  }
  const user = userSnap.data() || {};
  const subscriptionId = user.stripeSubscriptionId;
  if (!subscriptionId) {
    throw new Error('Owner has no stripeSubscriptionId — cannot override price');
  }

  const amountCents = Math.round(Number(amountUsd) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    throw new Error('amountUsd must be at least 1.00');
  }

  const monthsInt = months == null || months === '' ? 0 : Math.floor(Number(months));
  if (!Number.isFinite(monthsInt) || monthsInt < 0 || monthsInt > 36) {
    throw new Error('months must be 0–36 (0 = keep until changed again)');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  if (!subscription || subscription.status === 'canceled') {
    throw new Error(`Subscription is not active (${subscription && subscription.status})`);
  }
  const item = subscription.items && subscription.items.data && subscription.items.data[0];
  if (!item || !item.price) {
    throw new Error('Subscription has no price item');
  }

  const originalPriceId = item.price.id;
  const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;
  const currency = item.price.currency || 'usd';
  const interval = (item.price.recurring && item.price.recurring.interval) || 'month';
  const intervalCount = (item.price.recurring && item.price.recurring.interval_count) || 1;

  const overridePrice = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency,
    recurring: { interval, interval_count: intervalCount },
    nickname: `admin-override-${businessId}-${amountCents}`,
    metadata: {
      businessId,
      ownerId,
      adminUid,
      kind: 'platform_admin_override',
    },
  });

  let scheduleId = null;
  let periodEndBehavior = 'keep';

  if (monthsInt > 0) {
    // Temporary: N billing cycles at override, then revert to original price.
    let schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscriptionId,
    });
    const startDate = schedule.phases[0].start_date;
    schedule = await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'release',
      phases: [
        {
          start_date: startDate,
          items: [{ price: overridePrice.id, quantity: item.quantity || 1 }],
          iterations: monthsInt,
        },
        {
          items: [{ price: originalPriceId, quantity: item.quantity || 1 }],
        },
      ],
    });
    scheduleId = schedule.id;
    periodEndBehavior = 'revert_after_months';
  } else {
    // Permanent until admin changes again. No proration invoice; next invoice uses new price.
    await stripe.subscriptionItems.update(item.id, {
      price: overridePrice.id,
      proration_behavior: 'none',
    });
    periodEndBehavior = 'keep';
  }

  const overrideRecord = {
    amountUsd: amountCents / 100,
    amountCents,
    months: monthsInt,
    periodEndBehavior,
    originalPriceId,
    overridePriceId: overridePrice.id,
    scheduleId,
    stripeSubscriptionId: subscriptionId,
    setBy: adminUid,
    setAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await businessRef.set(
    {
      priceOverride: overrideRecord,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await userRef.set(
    {
      priceOverride: overrideRecord,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    businessId,
    ownerId,
    amountUsd: amountCents / 100,
    months: monthsInt,
    periodEndBehavior,
    originalPriceId,
    overridePriceId: overridePrice.id,
    scheduleId,
    stripeSubscriptionId: subscriptionId,
  };
}

async function sendAdminPromo({
  title,
  body,
  channels,
  audience,
  businessId,
  adminUid,
}) {
  const cleanTitle = String(title || '').trim();
  const cleanBody = String(body || '').trim();
  if (!cleanTitle || !cleanBody) {
    throw new Error('title and body are required');
  }
  if (cleanTitle.length > 120 || cleanBody.length > 2000) {
    throw new Error('title/body too long');
  }

  const wantPush = channels.includes('push');
  const wantEmail = channels.includes('email');
  if (!wantPush && !wantEmail) {
    throw new Error('Select at least one channel: push or email');
  }

  const config = getResendConfig();
  if (wantEmail && (!config.resendKey || !config.resendFrom)) {
    throw new Error('Email channel requires RESEND_API_KEY and RESEND_FROM');
  }

  const usersSnap = await admin.firestore().collection('users').get();
  const targets = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data() || {};
    if (data.banned === true) continue;

    if (audience === 'owners') {
      const biz = await admin.firestore().collection('businesses').doc(userDoc.id).get();
      if (!biz.exists) continue;
      const bizData = biz.data() || {};
      if (!(bizData.name && bizData.ownerId)) continue;
    } else if (audience === 'customers') {
      if (!businessId) {
        throw new Error('businessId is required for customers audience');
      }
      const scan = await admin
        .firestore()
        .collection('users')
        .doc(userDoc.id)
        .collection('scans')
        .doc(businessId)
        .get();
      if (!scan.exists) continue;
    } else if (audience !== 'all') {
      throw new Error('audience must be all, owners, or customers');
    }

    targets.push({
      id: userDoc.id,
      email: typeof data.email === 'string' ? data.email.trim() : '',
      name: typeof data.name === 'string' ? data.name : '',
      expoPushToken: typeof data.expoPushToken === 'string' ? data.expoPushToken : '',
    });
  }

  const MAX_SENDS = 500;
  const limited = targets.slice(0, MAX_SENDS);
  let pushSent = 0;
  let pushFailed = 0;
  let emailSent = 0;
  let emailFailed = 0;

  for (const target of limited) {
    if (wantPush && target.expoPushToken) {
      try {
        await sendExpoPushToken(target.expoPushToken, cleanTitle, cleanBody, {
          type: 'admin_promo',
          businessId: businessId || '',
        });
        pushSent += 1;
      } catch (error) {
        pushFailed += 1;
      }
    }
    if (wantEmail && target.email && target.email.includes('@')) {
      try {
        await sendPromoResendEmail(config, target.email, target.name, cleanTitle, cleanBody);
        emailSent += 1;
      } catch (error) {
        emailFailed += 1;
      }
    }
  }

  const logRef = await admin.firestore().collection('adminPromoLogs').add({
    title: cleanTitle,
    body: cleanBody,
    channels,
    audience,
    businessId: businessId || null,
    targetsMatched: targets.length,
    targetsAttempted: limited.length,
    pushSent,
    pushFailed,
    emailSent,
    emailFailed,
    truncated: targets.length > MAX_SENDS,
    sentBy: adminUid,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    logId: logRef.id,
    targetsMatched: targets.length,
    targetsAttempted: limited.length,
    pushSent,
    pushFailed,
    emailSent,
    emailFailed,
    truncated: targets.length > MAX_SENDS,
  };
}

exports.platformAdmin = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);

        if (!isPlatformAdminToken(decoded)) {
          return res.status(403).json({ error: 'Platform admin access required' });
        }

        const action = req.body && req.body.action;
        const userId = req.body && typeof req.body.userId === 'string' ? req.body.userId.trim() : '';

        if (action === 'revenue') {
          if (!getStripeSecretKey()) {
            return res.status(503).json({
              error: 'Stripe secret not configured on functions',
            });
          }

          let mrrCents = 0;
          let activeSubscriptions = 0;
          let startingAfterSub = null;
          for (;;) {
            const subParams = { status: 'active', limit: 100 };
            if (startingAfterSub) subParams.starting_after = startingAfterSub;
            const page = await stripe.subscriptions.list(subParams);
            for (const sub of page.data) {
              activeSubscriptions += 1;
              for (const item of sub.items.data) {
                const unit = item.price && typeof item.price.unit_amount === 'number'
                  ? item.price.unit_amount
                  : 0;
                const qty = typeof item.quantity === 'number' ? item.quantity : 1;
                const interval = item.price && item.price.recurring
                  ? item.price.recurring.interval
                  : 'month';
                const intervalCount =
                  item.price && item.price.recurring && item.price.recurring.interval_count
                    ? item.price.recurring.interval_count
                    : 1;
                let monthly = unit * qty;
                if (interval === 'year') {
                  monthly = Math.round((unit * qty) / (12 * intervalCount));
                } else if (interval === 'week') {
                  monthly = Math.round((unit * qty * 52) / (12 * intervalCount));
                } else if (intervalCount > 1) {
                  monthly = Math.round((unit * qty) / intervalCount);
                }
                mrrCents += monthly;
              }
            }
            if (!page.has_more || page.data.length === 0) break;
            startingAfterSub = page.data[page.data.length - 1].id;
          }

          let allTimePaidCents = 0;
          let invoicesScanned = 0;
          let startingAfterInv = null;
          for (;;) {
            const invParams = { status: 'paid', limit: 100 };
            if (startingAfterInv) invParams.starting_after = startingAfterInv;
            const page = await stripe.invoices.list(invParams);
            for (const invoice of page.data) {
              invoicesScanned += 1;
              if (typeof invoice.amount_paid === 'number') {
                allTimePaidCents += invoice.amount_paid;
              }
            }
            if (!page.has_more || page.data.length === 0) break;
            startingAfterInv = page.data[page.data.length - 1].id;
          }

          return res.json({
            ok: true,
            action: 'revenue',
            currency: 'usd',
            mrrCents,
            mrrUsd: mrrCents / 100,
            activeSubscriptions,
            allTimePaidCents,
            allTimePaidUsd: allTimePaidCents / 100,
            invoicesScanned,
            source: 'stripe',
          });
        }

        if (action === 'setPriceOverride') {
          if (req.body?.confirm !== true) {
            return res.status(400).json({
              error: 'confirm: true is required for billing changes',
            });
          }
          const businessId =
            typeof req.body.businessId === 'string' ? req.body.businessId.trim() : '';
          if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
          }
          const result = await applySubscriptionPriceOverride({
            businessId,
            amountUsd: req.body.amountUsd,
            months: req.body.months,
            adminUid: decoded.uid,
          });
          return res.json({
            ok: true,
            action: 'setPriceOverride',
            ...result,
          });
        }

        if (action === 'sendPromo') {
          if (req.body?.confirm !== true) {
            return res.status(400).json({
              error: 'confirm: true is required before sending promos',
            });
          }
          const channels = Array.isArray(req.body.channels)
            ? req.body.channels.map((c) => String(c))
            : [];
          const audience = typeof req.body.audience === 'string' ? req.body.audience.trim() : 'all';
          const businessId =
            typeof req.body.businessId === 'string' ? req.body.businessId.trim() : '';
          const result = await sendAdminPromo({
            title: req.body.title,
            body: req.body.body,
            channels,
            audience,
            businessId: businessId || null,
            adminUid: decoded.uid,
          });
          return res.json({
            ok: true,
            action: 'sendPromo',
            ...result,
          });
        }

        if (!userId) {
          return res.status(400).json({ error: 'userId is required' });
        }

        if (userId === decoded.uid) {
          return res.status(400).json({ error: 'You cannot ban or delete your own admin account' });
        }

        if (action === 'ban') {
          await admin.firestore().collection('users').doc(userId).set(
            {
              banned: true,
              bannedAt: admin.firestore.FieldValue.serverTimestamp(),
              bannedBy: decoded.uid,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          let authDisabled = false;
          try {
            await admin.auth().updateUser(userId, { disabled: true });
            authDisabled = true;
          } catch (authError) {
            if (authError.code !== 'auth/user-not-found') {
              throw authError;
            }
          }

          const businessDeactivated = await deactivateOwnedBusiness(userId);

          return res.json({
            ok: true,
            action: 'ban',
            userId,
            authDisabled,
            businessDeactivated,
          });
        }

        if (action === 'unban') {
          await admin.firestore().collection('users').doc(userId).set(
            {
              banned: false,
              unbannedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          let authDisabled = false;
          try {
            await admin.auth().updateUser(userId, { disabled: false });
            authDisabled = false;
          } catch (authError) {
            if (authError.code !== 'auth/user-not-found') {
              throw authError;
            }
          }

          return res.json({
            ok: true,
            action: 'unban',
            userId,
            authDisabled,
          });
        }

        if (action === 'delete') {
          const userRef = admin.firestore().collection('users').doc(userId);
          const scansDeleted = await deleteQueryInBatches(userRef.collection('scans'));
          const rewardsDeleted = await deleteQueryInBatches(userRef.collection('rewards'));
          const pendingDeleted = await deleteQueryInBatches(userRef.collection('pendingStamps'));

          const userSnap = await userRef.get();
          if (userSnap.exists) {
            await userRef.delete();
          }

          const businessDeactivated = await deactivateOwnedBusiness(userId);

          let authDeleted = false;
          try {
            await admin.auth().deleteUser(userId);
            authDeleted = true;
          } catch (authError) {
            if (authError.code !== 'auth/user-not-found') {
              throw authError;
            }
          }

          return res.json({
            ok: true,
            action: 'delete',
            userId,
            authDeleted,
            firestoreDeleted: true,
            businessDeactivated,
            deleted: {
              scans: scansDeleted,
              rewards: rewardsDeleted,
              pendingStamps: pendingDeleted,
            },
          });
        }

        return res.status(400).json({
          error: 'Unknown action. Use ban, unban, delete, revenue, setPriceOverride, or sendPromo.',
        });
      } catch (error) {
        console.error('[platformAdmin] error:', error);
        return res.status(500).json({
          error: error.message || 'Platform admin request failed',
        });
      }
    });
  });
