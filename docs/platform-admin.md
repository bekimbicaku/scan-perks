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

## What the panel shows

- Businesses signed up, on trial, paid/active  
- Customer + scan totals from `businesses/{id}/statistics/scans`  
- Trials ending within 3 days, banned user count  
- Searchable business list + detail (plan, trial, customers)  
- Users list with ban / unban / delete (confirmations required)

## Ban vs delete

| Action | Auth | Firestore user | Owned business |
|--------|------|----------------|----------------|
| **Ban** | Disabled | `banned: true` | Soft-deactivated (`isActive: false`) |
| **Unban** | Re-enabled | `banned: false` | Stays inactive (manual re-enable) |
| **Delete** | Deleted | Profile + scans/rewards/pendingStamps removed | Soft-deactivated (no full cascade) |

Prefer ban first. Hard delete does not wipe every customer mirror under other businesses.
