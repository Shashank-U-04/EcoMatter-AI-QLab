"use client";

// Firebase Authentication client. When the NEXT_PUBLIC_FIREBASE_* env vars are
// absent (local dev, E2E), isFirebaseEnabled() is false and the app falls back
// to the classic email/password endpoints.
import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseEnabled(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function auth() {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getAuth(app);
}

// Firebase error codes read like "auth/wrong-password" — translate the common
// ones so users never see raw codes.
const ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/weak-password": "Password is too weak — use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in popup — allow popups and retry.",
  "auth/network-request-failed": "Network error — check your connection and retry.",
};

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return err instanceof Error ? err.message : "Authentication failed";
}

export async function firebaseEmailSignup(
  name: string,
  email: string,
  password: string
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth(), email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user.getIdToken();
}

export async function firebaseEmailLogin(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth(), email, password);
  return cred.user.getIdToken();
}

export async function firebaseGoogleLogin(): Promise<{ idToken: string; name: string }> {
  const cred = await signInWithPopup(auth(), new GoogleAuthProvider());
  return {
    idToken: await cred.user.getIdToken(),
    name: cred.user.displayName || "",
  };
}

export function firebaseResetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth(), email);
}

export function firebaseSignOut(): void {
  if (!isFirebaseEnabled()) return;
  // Fire-and-forget: local session is cleared regardless.
  signOut(auth()).catch(() => {});
}
