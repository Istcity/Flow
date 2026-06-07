import Constants from 'expo-constants';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, enableNetwork } from 'firebase/firestore';

/** Release build yedek — app.config.js ile aynı */
const FALLBACK_FIREBASE = {
  apiKey: 'AIzaSyCyOBzZ9mKSb5-98qC4J4DkMDMhACzi-i4',
  authDomain: 'flow-e5f5a.firebaseapp.com',
  projectId: 'flow-e5f5a',
  storageBucket: 'flow-e5f5a.firebasestorage.app',
  messagingSenderId: '626955387756',
  appId: '1:626955387756:ios:8ce73e5f9d4fc4ffeb2949',
};

const extraFirebase = Constants.expoConfig?.extra?.firebase as
  | Record<string, string | undefined>
  | undefined;

/** iOS ve Android aynı Firebase projesine (Firestore) bağlanır — veriler bulutta paylaşılır. */
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    extraFirebase?.apiKey ??
    FALLBACK_FIREBASE.apiKey,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    extraFirebase?.authDomain ??
    FALLBACK_FIREBASE.authDomain,
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??
    extraFirebase?.projectId ??
    FALLBACK_FIREBASE.projectId,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    extraFirebase?.storageBucket ??
    FALLBACK_FIREBASE.storageBucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    extraFirebase?.messagingSenderId ??
    FALLBACK_FIREBASE.messagingSenderId,
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extraFirebase?.appId ?? FALLBACK_FIREBASE.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

try {
  initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  // Firestore zaten başlatılmış
}

export const auth = getAuth(app);
export const db = getFirestore(app);

/** React Native'de Firestore bazen offline kalır — ağı aç */
export async function ensureFirestoreOnline(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch {
    // Zaten açık olabilir
  }
}

export default app;
