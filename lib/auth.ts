import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Constants
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_TIMEOUT = 60; // seconds
const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// Generate random verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
export async function sendVerificationEmail(email: string, code: string) {
  try {
    // In a real app, you would integrate with an email service here
    // For demo purposes, we'll just simulate email sending
    console.log(`Verification code ${code} sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

// Create new user account
export async function createAccount(
  email: string,
  password: string,
  name: string
) {
  try {
    const verificationCode = generateVerificationCode();
    await sendVerificationEmail(email, verificationCode);

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + VERIFICATION_CODE_TIMEOUT * 1000),
      verified: false,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return { user, verificationCode };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

// Store authentication tokens
export async function storeAuthTokens(tokens: { accessToken: string; refreshToken: string }) {
  try {
    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, tokens.accessToken],
      [REFRESH_TOKEN_KEY, tokens.refreshToken],
    ]);
    return true;
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
}

// Get stored tokens
export async function getStoredTokens() {
  try {
    const [accessToken, refreshToken] = await AsyncStorage.multiGet([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
    ]);
    return {
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
    };
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}

// Delete account and all associated data
export async function deleteUserAccount(password: string) {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');

    // Re-authenticate user before deletion
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Create a new batch
    const batch = writeBatch(db);

    // Delete user's scans
    const scansRef = collection(db, 'users', user.uid, 'scans');
    const scansSnapshot = await getDocs(scansRef);
    scansSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete user's rewards
    const rewardsRef = collection(db, 'users', user.uid, 'rewards');
    const rewardsSnapshot = await getDocs(rewardsRef);
    rewardsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete user document
    batch.delete(doc(db, 'users', user.uid));

    // Execute batch delete
    await batch.commit();

    // Delete user authentication
    await deleteUser(user);

    // Clear stored tokens
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);

    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}

// Configure deep linking
export function getDeepLinkUrl(path: string): string {
  if (Platform.OS === 'ios') {
    return `https://apps.apple.com/app/id6744923279${path}`;
  } else if (Platform.OS === 'android') {
    return `https://play.google.com/store/apps/details?id=com.scanperks.app&hl=en${path}`;
  }
  return `https://scanperks.app${path}`;
}