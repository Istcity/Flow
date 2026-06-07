import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, ensureFirestoreOnline } from './config';
import type { UserProfile } from '@/types';

const USERS_COLLECTION = 'users';
const DEFAULT_GOOGLE_ROLE = 'workshop' as const;
const MAX_RETRIES = 3;

function isOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('offline') || msg.includes('unavailable') || msg.includes('network');
}

function profileFromAuthUser(user: User): UserProfile {
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'Kullanıcı',
    role: DEFAULT_GOOGLE_ROLE,
    orgId: '',
  };
}

async function withFirestoreRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      await ensureFirestoreOnline();
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isOfflineError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function signInWithGoogle(idToken: string): Promise<UserProfile> {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  return getOrCreateUserProfile(userCredential.user);
}

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  try {
    const existing = await fetchUserProfile(user.uid);
    if (existing) {
      return existing;
    }

    const profile = profileFromAuthUser(user);
    await withFirestoreRetry(() => setDoc(doc(db, USERS_COLLECTION, profile.id), profile));
    return profile;
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn('[FLOW] Firestore offline — geçici profil ile devam ediliyor.');
      return profileFromAuthUser(user);
    }
    throw error;
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  return withFirestoreRetry(async () => {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!snapshot.exists()) return null;
    return snapshot.data() as UserProfile;
  });
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

function isGoogleUser(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'google.com');
}

export function subscribeToAuthChanges(
  callback: (user: User | null, profile: UserProfile | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }

    try {
      let profile = await fetchUserProfile(user.uid);

      if (!profile && isGoogleUser(user)) {
        profile = await getOrCreateUserProfile(user);
      }

      callback(user, profile);
    } catch (error) {
      console.warn('[FLOW] Profil yüklenemedi:', error);
      callback(user, profileFromAuthUser(user));
    }
  });
}
