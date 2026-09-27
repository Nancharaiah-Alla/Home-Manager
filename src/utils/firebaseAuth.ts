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

// Support both embedded firebase-applet-config.json and Vercel/Vite environment variables
const env = import.meta.env;
const resolvedConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || '',
};

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();
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
    
    // Explicit domain authorization error guide for Vercel deployments
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
      throw new Error(
        `Vercel domain "${currentHost}" is not authorized in Firebase. ` +
        `To fix: Open Firebase Console -> Authentication -> Settings -> Authorized Domains, and add "${currentHost}".`
      );
    }

    // If popup is blocked by the browser or interrupted by cross-origin opener policy, fallback to redirect flow
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.message?.includes('Cross-Origin-Opener-Policy') ||
      error.message?.includes('window.closed')
    ) {
      console.warn('Popup blocked or affected by cross-origin policy, switching to redirect flow...');
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
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
      console.error(
        `Vercel domain "${currentHost}" is not authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      );
    } else {
      console.warn('Error checking Google redirect result:', err);
    }
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
