const functions = require('firebase-functions');
const admin = require('firebase-admin');

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 200;
const MAX_SENDS = 500;

function readConfig() {
  let legacy = {};
  try {
    legacy = functions.config && functions.config().reengage ? functions.config().reengage : {};
  } catch (error) {
    console.warn('reengage functions.config unavailable', error);
  }

  const inactiveDays = Number(process.env.INACTIVE_DAYS || legacy.inactive_days || 14);
  const appName = process.env.APP_NAME || legacy.app_name || 'Scan Perks';
  const appUrl = (process.env.APP_URL || legacy.app_url || 'https://app.scan-perks.com').replace(
    /\/$/,
    ''
  );
  const ctaPath = process.env.CTA_PATH || legacy.cta_path || '';
  const title = process.env.REMINDER_TITLE || legacy.reminder_title || 'Your stamps are still here';
  const body =
    process.env.REMINDER_BODY ||
    legacy.reminder_body ||
    'It has been a while. Open Scan Perks to check your stamps and rewards.';

  return {
    inactiveDays: Number.isFinite(inactiveDays) && inactiveDays > 0 ? inactiveDays : 14,
    appName,
    appUrl,
    ctaUrl: `${appUrl}${ctaPath.startsWith('/') || ctaPath === '' ? ctaPath : `/${ctaPath}`}`,
    title,
    body,
    resendKey: process.env.RESEND_API_KEY || legacy.resend_api_key || '',
    resendFrom: process.env.RESEND_FROM || legacy.resend_from || '',
  };
}

function timestampMillis(value) {
  if (!value || typeof value.toMillis !== 'function') return null;
  return value.toMillis();
}

async function sendExpoPush(token, title, body, data) {
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
      data,
      channelId: 'offers',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.errors?.[0]?.message || `Expo push failed (${response.status})`);
    error.expo = payload;
    throw error;
  }

  const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  if (ticket && ticket.status === 'error') {
    const error = new Error(ticket.message || 'Expo push ticket error');
    error.code = ticket.details && ticket.details.error;
    throw error;
  }
}

async function sendResendEmail(config, to, name) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = [
    greeting,
    '',
    config.body,
    '',
    `Open Scan Perks: ${config.ctaUrl}`,
    '',
    `— ${config.appName}`,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to: [to],
      subject: config.title,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend failed (${response.status}): ${payload.slice(0, 300)}`);
  }
}

async function resolveEmail(userRef, data) {
  if (typeof data.email === 'string' && data.email.includes('@')) {
    return data.email.trim();
  }

  try {
    const user = await admin.auth().getUser(userRef.id);
    if (user.email) return user.email;
  } catch (error) {
    console.error(`reengage auth lookup failed for ${userRef.id}`, error);
  }

  return '';
}

async function claimReminder(userRef, lastSeenMillis) {
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return false;

    const data = snap.data() || {};
    const seen = timestampMillis(data.lastSeenAt);
    if (seen !== lastSeenMillis) return false;

    const already = timestampMillis(data.reengageSentForLastSeen);
    if (already === lastSeenMillis) return false;

    tx.set(
      userRef,
      {
        reengageSentForLastSeen: data.lastSeenAt,
        reengageSentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}

async function releaseClaim(userRef) {
  await userRef.set(
    {
      reengageSentForLastSeen: admin.firestore.FieldValue.delete(),
      reengageSentAt: admin.firestore.FieldValue.delete(),
    },
    { merge: true }
  );
}

async function deliver(userRef, data, config) {
  const token = typeof data.expoPushToken === 'string' ? data.expoPushToken.trim() : '';
  const payload = { type: 'reengage', url: config.ctaUrl };

  if (token) {
    try {
      await sendExpoPush(token, config.title, config.body, payload);
      return 'push';
    } catch (error) {
      if (error.code !== 'DeviceNotRegistered') throw error;
      await userRef.set(
        { expoPushToken: admin.firestore.FieldValue.delete() },
        { merge: true }
      );
    }
  }

  if (!config.resendKey || !config.resendFrom) return null;

  const email = await resolveEmail(userRef, data);
  if (!email) return null;

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  await sendResendEmail(config, email, name);
  return 'email';
}

async function runReengage() {
  const config = readConfig();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - config.inactiveDays * DAY_MS);
  const summary = {
    inactiveDays: config.inactiveDays,
    scanned: 0,
    pushed: 0,
    emailed: 0,
    skippedNoChannel: 0,
    skippedAlreadySent: 0,
    failed: 0,
    capped: false,
  };

  let cursor = null;
  let sent = 0;

  while (sent < MAX_SENDS) {
    let query = admin
      .firestore()
      .collection('users')
      .where('lastSeenAt', '<', cutoff)
      .orderBy('lastSeenAt')
      .limit(PAGE_SIZE);

    if (cursor) query = query.startAfter(cursor);

    const page = await query.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      summary.scanned += 1;
      const data = doc.data() || {};
      const lastSeenMillis = timestampMillis(data.lastSeenAt);
      if (lastSeenMillis == null) continue;

      if (timestampMillis(data.reengageSentForLastSeen) === lastSeenMillis) {
        summary.skippedAlreadySent += 1;
        continue;
      }

      const hasToken = typeof data.expoPushToken === 'string' && data.expoPushToken.trim().length > 0;
      const emailReady = Boolean(config.resendKey && config.resendFrom);
      if (!hasToken && !emailReady) {
        summary.skippedNoChannel += 1;
        continue;
      }

      if (sent >= MAX_SENDS) {
        summary.capped = true;
        break;
      }

      const claimed = await claimReminder(doc.ref, lastSeenMillis);
      if (!claimed) {
        summary.skippedAlreadySent += 1;
        continue;
      }

      try {
        const channel = await deliver(doc.ref, data, config);
        if (!channel) {
          await releaseClaim(doc.ref);
          summary.skippedNoChannel += 1;
          continue;
        }

        await doc.ref.set({ reengageChannel: channel }, { merge: true });
        if (channel === 'push') summary.pushed += 1;
        else summary.emailed += 1;
        sent += 1;
      } catch (error) {
        console.error(`reengage failed for ${doc.id}`, error);
        await releaseClaim(doc.ref).catch((releaseError) => {
          console.error(`reengage claim release failed for ${doc.id}`, releaseError);
        });
        summary.failed += 1;
      }
    }

    if (summary.capped || page.size < PAGE_SIZE) break;
    cursor = page.docs[page.docs.length - 1];
  }

  return summary;
}

exports.reengageInactiveUsers = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .pubsub.schedule('0 10 * * *')
  .timeZone('Europe/Tirane')
  .onRun(async () => {
    const summary = await runReengage();
    console.log('reengage summary', summary);
    return null;
  });

exports.runReengage = runReengage;
