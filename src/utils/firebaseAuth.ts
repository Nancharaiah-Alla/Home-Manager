import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  Auth,
  UserCredential,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Configure Google Provider with required profile and email scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
// Force Google's account selection prompt every time so users can choose their account
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleAuthResult {
  idToken?: string;
  accessToken?: string;
  email: string;
  name?: string;
  photoUrl?: string;
}

/**
 * Parses user credentials from a Firebase sign-in result.
 */
async function extractGoogleCredentials(cred: UserCredential): Promise<GoogleAuthResult> {
  const user = cred.user;
  const idToken = await user.getIdToken();
  const oauthCredential = GoogleAuthProvider.credentialFromResult(cred);
  const accessToken = oauthCredential?.accessToken;

  const email = user.email;
  if (!email) {
    throw new Error('No verified email found for this Google account.');
  }

  return {
    idToken,
    accessToken,
    email,
    name: user.displayName || undefined,
    photoUrl: user.photoURL || undefined,
  };
}

/**
 * Initiates official Google Sign-In with Google Identity / OAuth 2.0.
 * Directly launches Google's account selector/login interface.
 */
export async function signInWithGoogleOAuth(): Promise<GoogleAuthResult> {
  try {
    // Attempt standard popup flow for immediate response
    const cred = await signInWithPopup(auth, provider);
    return await extractGoogleCredentials(cred);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // If popup is blocked by the browser, fallback to redirect flow
    if (error.code === 'auth/popup-blocked') {
      console.warn('Popup blocked, attempting redirect flow to Google...');
      await signInWithRedirect(auth, provider);
      throw new Error('Redirecting to Google for account selection...');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in was closed before completion.');
    }
    throw new Error(error.message || 'Failed to authenticate with Google');
  }
}

/**
 * Checks if the page loaded after a Google OAuth redirect.
 */
export async function checkGoogleRedirectResult(): Promise<GoogleAuthResult | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (cred && cred.user) {
      return await extractGoogleCredentials(cred);
    }
  } catch (err) {
    console.warn('Error checking Google redirect result:', err);
  }
  return null;
}

/**
 * Signs out from Firebase/Google
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Error signing out of Google auth:', err);
  }
}
