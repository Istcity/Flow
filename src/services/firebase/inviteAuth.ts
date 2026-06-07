import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, ensureFirestoreOnline } from './config';
import {
  findAssignmentByEmailAndCode,
  getAssignedOrderIdsForEmail,
  markAssignmentAccepted,
} from './assignments';
import type { UserProfile } from '@/types';

const USERS_COLLECTION = 'users';
const ORGANIZATIONS_COLLECTION = 'organizations';
const SESSION_KEY = '@flow/auth_session';

function mapUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    id,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    role: data.role as UserProfile['role'],
    orgId: String(data.orgId ?? ''),
    organizationName: data.organizationName ? String(data.organizationName) : undefined,
    assignedOrderIds: Array.isArray(data.assignedOrderIds)
      ? data.assignedOrderIds.map(String)
      : [],
  };
}

export async function registerAdmin(input: {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}): Promise<UserProfile> {
  await ensureFirestoreOnline();

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const organizationName = input.organizationName.trim();

  if (!email || !displayName || !organizationName) {
    throw new Error('E-posta, ad ve firma adı zorunludur.');
  }
  if (input.password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  let user: User;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, input.password);
    user = cred.user;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-in-use') {
      throw new Error('Bu e-posta zaten kayıtlı. Yönetici girişi yapın.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Şifre çok zayıf. En az 6 karakter kullanın.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Geçersiz e-posta adresi.');
    }
    throw new Error('Hesap oluşturulamadı. İnternet bağlantınızı kontrol edin.');
  }

  try {
    const orgRef = await addDoc(collection(db, ORGANIZATIONS_COLLECTION), {
      name: organizationName,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });

    const profile: UserProfile = {
      id: user.uid,
      email,
      displayName,
      role: 'admin',
      orgId: orgRef.id,
      organizationName,
      assignedOrderIds: [],
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
  } catch (err) {
    await signOut(auth);
    throw err instanceof Error ? err : new Error('Kayıt tamamlanamadı.');
  }
}

export async function loginWithInvite(email: string, inviteCodeOrPassword: string): Promise<UserProfile> {
  await ensureFirestoreOnline();

  const normalizedEmail = email.trim().toLowerCase();
  const secret = inviteCodeOrPassword.trim();

  const assignment = await findAssignmentByEmailAndCode(normalizedEmail, secret);

  if (assignment) {
    let user: User;
    try {
      const cred = await signInWithEmailAndPassword(auth, assignment.email, secret);
      user = cred.user;
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, assignment.email, secret);
      user = cred.user;
    }

    if (!assignment.orgId) {
      throw new Error('Davet kaydı geçersiz. Yöneticinizden yeni davet isteyin.');
    }

    await markAssignmentAccepted(assignment.id, user.uid);

    const orderIds = await getAssignedOrderIdsForEmail(assignment.email);
    const profile: UserProfile = {
      id: user.uid,
      email: assignment.email,
      displayName: assignment.displayName,
      role: assignment.role,
      orgId: assignment.orgId,
      assignedOrderIds: orderIds,
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), profile, { merge: true });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
  }

  let user: User;
  try {
    const cred = await signInWithEmailAndPassword(auth, normalizedEmail, secret);
    user = cred.user;
  } catch {
    throw new Error('Geçersiz e-posta veya davet kodu / şifre.');
  }

  const profile = await fetchUserProfile(user.uid);
  if (!profile || profile.role === 'admin' || !profile.orgId) {
    await signOut(auth);
    throw new Error('Geçersiz e-posta veya davet kodu / şifre.');
  }

  const orderIds = await getAssignedOrderIdsForEmail(profile.email);
  const updated = { ...profile, assignedOrderIds: orderIds };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  return updated;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await ensureFirestoreOnline();

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error('E-posta adresi gerekli.');
  }

  try {
    await sendPasswordResetEmail(auth, normalized);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/invalid-email') {
      throw new Error('Geçersiz e-posta adresi.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin.');
    }
    throw new Error('Sıfırlama e-postası gönderilemedi. E-postayı kontrol edin.');
  }
}

export async function loginAsAdmin(email: string, password: string): Promise<UserProfile> {
  await ensureFirestoreOnline();

  let user: User;
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    user = cred.user;
  } catch {
    throw new Error('E-posta veya şifre hatalı.');
  }

  const profile = await fetchUserProfile(user.uid);
  if (!profile || profile.role !== 'admin' || !profile.orgId) {
    await signOut(auth);
    throw new Error('Yönetici hesabı bulunamadı. Önce "Hesap Oluştur" ile kayıt olun.');
  }

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  return profile;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureFirestoreOnline();
  const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!snap.exists()) return null;
  return mapUserProfile(snap.id, snap.data());
}

export async function restoreSession(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as UserProfile;
    if (auth.currentUser) {
      const fresh = await fetchUserProfile(auth.currentUser.uid);
      if (fresh) {
        if (fresh.role !== 'admin') {
          fresh.assignedOrderIds = await getAssignedOrderIdsForEmail(fresh.email);
        }
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
        return fresh;
      }
    }
    return cached.orgId ? cached : null;
  } catch {
    return null;
  }
}

export async function logOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await signOut(auth);
}

export async function refreshProfileOrderIds(profile: UserProfile): Promise<UserProfile> {
  if (profile.role === 'admin') return profile;
  const orderIds = await getAssignedOrderIdsForEmail(profile.email);
  const updated = { ...profile, assignedOrderIds: orderIds };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid), updated, { merge: true });
    } catch {
      // Firestore senkronu başarısız olsa bile yerel oturum güncellenir
    }
  }
  return updated;
}
