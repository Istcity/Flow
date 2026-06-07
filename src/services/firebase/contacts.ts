import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, ensureFirestoreOnline } from './config';
import type { SavedContact, UserProfile, UserRole } from '@/types';

const CONTACTS_COLLECTION = 'savedContacts';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function contactDocId(orgId: string, email: string): string {
  return `${orgId}__${normalizeEmail(email).replace(/\//g, '_')}`;
}

function mapContact(id: string, data: Record<string, unknown>): SavedContact {
  return {
    id,
    orgId: String(data.orgId ?? ''),
    email: String(data.email ?? id),
    displayName: String(data.displayName ?? ''),
    defaultRole: (data.defaultRole as SavedContact['defaultRole']) ?? 'workshop',
    createdBy: String(data.createdBy ?? ''),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : String(data.createdAt ?? new Date().toISOString()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function upsertSavedContact(
  actor: UserProfile,
  input: {
    email: string;
    displayName: string;
    defaultRole: Exclude<UserRole, 'admin'>;
  }
): Promise<SavedContact> {
  await ensureFirestoreOnline();

  const email = normalizeEmail(input.email);
  const id = contactDocId(actor.orgId, email);
  const payload = {
    orgId: actor.orgId,
    email,
    displayName: input.displayName.trim(),
    defaultRole: input.defaultRole,
    createdBy: actor.id,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, CONTACTS_COLLECTION, id);
  const existingSnap = await getDoc(ref);
  const isNew = !existingSnap.exists();

  await setDoc(
    ref,
    isNew ? { ...payload, createdAt: serverTimestamp() } : payload,
    { merge: true }
  );

  return {
    id,
    orgId: actor.orgId,
    email,
    displayName: input.displayName.trim(),
    defaultRole: input.defaultRole,
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchSavedContacts(orgId: string): Promise<SavedContact[]> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(
    query(collection(db, CONTACTS_COLLECTION), where('orgId', '==', orgId))
  );
  return snapshot.docs
    .map((d) => mapContact(d.id, d.data()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
}

export function subscribeSavedContacts(
  orgId: string,
  onUpdate: (contacts: SavedContact[]) => void,
  onError?: (error: Error) => void
): () => void {
  void ensureFirestoreOnline();
  return onSnapshot(
    query(collection(db, CONTACTS_COLLECTION), where('orgId', '==', orgId)),
    (snapshot) => {
      try {
        const contacts = snapshot.docs
          .map((d) => mapContact(d.id, d.data()))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
        onUpdate(contacts);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export async function deleteSavedContact(contactId: string): Promise<void> {
  await ensureFirestoreOnline();
  await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
}

export async function createSavedContact(
  actor: UserProfile,
  input: {
    email: string;
    displayName: string;
    defaultRole: Exclude<UserRole, 'admin'>;
  }
): Promise<SavedContact> {
  if (!input.email.trim() || !input.displayName.trim()) {
    throw new Error('E-posta ve ad zorunludur.');
  }
  return upsertSavedContact(actor, input);
}

export function resolveContactsByIds(
  contacts: SavedContact[],
  contactIds: string[]
): SavedContact[] {
  const map = new Map(contacts.map((c) => [c.id, c]));
  return contactIds.map((id) => map.get(id)).filter((c): c is SavedContact => c != null);
}
