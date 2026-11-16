import type { User } from 'firebase/auth';

/** Default platform admins. Override/extend with EXPO_PUBLIC_ADMIN_EMAILS (comma-separated). */
const DEFAULT_ADMIN_EMAILS = ['bekimbicaku4@gmail.com'];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/**
 * Platform admin if email is on the allowlist, or Firebase custom claim `admin: true`.
 * To grant via claim (optional): Firebase Admin SDK
 *   `auth.setCustomUserClaims(uid, { admin: true })`
 */
export async function isPlatformAdmin(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;

  try {
    const token = await user.getIdTokenResult();
    return token.claims.admin === true;
  } catch {
    return false;
  }
}
