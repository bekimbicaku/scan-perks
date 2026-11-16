# Platform admin (`/admin`)

Restricted to platform admins only — not every business owner.

## How Bekim gets access

1. **Email allowlist (default)**  
   - Client: `EXPO_PUBLIC_ADMIN_EMAILS` (comma-separated), plus built-in default `bekimbicaku4@gmail.com` in `lib/adminAccess.ts`.  
   - Firestore rules: same email (and/or custom claim) in `isPlatformAdmin()` inside `firestore.rules`.  
   - Cloud Function: `ADMIN_EMAILS` or `EXPO_PUBLIC_ADMIN_EMAILS`, plus the same default.

2. **Optional custom claim**  
   From a machine with Firebase Admin credentials:
   ```js
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   ```
   Then sign out/in so the ID token refreshes. Claims are accepted by the client gate, rules, and `platformAdmin` function.

3. **Deploy**  
   - Ship Firestore rules (`firebase deploy --only firestore:rules`).  
   - Deploy functions so ban/delete can disable/delete Auth users (`firebase deploy --only functions:platformAdmin`).

Open `https://app.scan-perks.com/admin` while signed in with an allowlisted email.

## Opening from the app

Signed-in platform admins see a **Platform admin** button on the Profile tab (above Sign Out). It uses `isPlatformAdmin()` (email allowlist / `admin` claim) and navigates to `/admin` on native and web. Non-admins never see the button; `/admin` still re-checks the gate.

## What the panel shows

- Businesses signed up, on trial, paid/active  
- Owner identity per venue (name, email, uid) from `users/{ownerId}`  
- Catalog MRR (Starter $10 / Growth $15 × paying venues)  
- Stripe live MRR + all-time paid via `platformAdmin` action `revenue` (when deployed)  
- Paying venues list (plan + Stripe subscription id when stored)  
- Trial funnel: started / converted / expired unpaid · trials ≤3d  
- Cancelled subscriptions · stale venues (0 customers or no scan in 14d) · stale owners (no login/seen in 14d)  
- Scans last 7d vs prior 7d from `businesses/{id}/analytics/daily`  
- Customer + scan totals from `businesses/{id}/statistics/scans`  
- Searchable business list + detail (plan, trial, owner, Stripe ids)  
- Per-business Stripe **price override** on business detail (confirm required)  
  - `months = 0`: keep override until changed again  
  - `months ≥ 1`: Stripe subscription schedule reverts to the original price after N billing cycles  
  - No proration invoice; new amount applies on subsequent invoices / schedule phases  
- **/admin/promo**: promotional Expo push + Resend email (confirm required; audiences: all / owners / customers-of-business; capped at 500)  
- Users list with ban / unban / delete (confirmations required)

## Resend email for `/admin/promo`

Promo **push** works without Resend (needs `users.expoPushToken`). Promo **email** needs both secrets on Cloud Functions — they are **not** in Cursor Runtime Secrets or Firebase `functions.config` today (only Stripe is configured).

### Secret names Bekim must add

| Name | Where | Purpose |
|------|--------|---------|
| `RESEND_API_KEY` | Firebase Functions env **or** `functions.config` | Resend API key |
| `RESEND_FROM` | Firebase Functions env **or** `functions.config` | Verified sender, e.g. `ScanPerks <hello@scan-perks.com>` |

Recommended from-address (verify the domain in Resend first): **`ScanPerks <hello@scan-perks.com>`**. No verified ScanPerks sender was already stored in the repo.

### How `sendPromo` reads config

`platformAdmin` → `getResendConfig()` (same pattern as reengage):

1. `process.env.RESEND_API_KEY` / `process.env.RESEND_FROM`
2. `functions.config().resend.api_key` (or `.key`) / `functions.config().resend.from`
3. `functions.config().reengage.resend_api_key` / `functions.config().reengage.resend_from`

### Set via Firebase CLI (then redeploy)

```bash
npx firebase-tools@13 functions:config:set \
  reengage.resend_api_key="YOUR_RESEND_API_KEY" \
  reengage.resend_from="ScanPerks <hello@scan-perks.com>" \
  --project scanperks-cc721

npx firebase-tools@13 deploy --only functions:platformAdmin --project scanperks-cc721
```

Equivalent config keys: `resend.api_key` + `resend.from`. After deploy, `/admin/promo` → Email status (or `emailStatus` action) should show configured; never log secret values.

## Ban vs delete

| Action | Auth | Firestore user | Owned business |
|--------|------|----------------|----------------|
| **Ban** | Disabled | `banned: true` | Soft-deactivated (`isActive: false`) |
| **Unban** | Re-enabled | `banned: false` | Stays inactive (manual re-enable) |
| **Delete** | Deleted | Profile + scans/rewards/pendingStamps removed | Soft-deactivated (no full cascade) |

Prefer ban first. Hard delete does not wipe every customer mirror under other businesses.
