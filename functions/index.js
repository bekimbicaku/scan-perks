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
      case "invoice.paid":
      case "invoice.payment_succeeded":
        // Activation is handled on checkout.session.completed; acknowledge these events.
        break;

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
