import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, ensureFirestoreOnline } from './config';
import type { ContactGroup, UserProfile } from '@/types';

const GROUPS_COLLECTION = 'contactGroups';

function mapGroup(id: string, data: Record<string, unknown>): ContactGroup {
  const rawIds = data.contactIds;
  return {
    id,
    orgId: String(data.orgId ?? ''),
    name: String(data.name ?? ''),
    contactIds: Array.isArray(rawIds) ? rawIds.map(String) : [],
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

export function subscribeContactGroups(
  orgId: string,
  onUpdate: (groups: ContactGroup[]) => void,
  onError?: (error: Error) => void
): () => void {
  void ensureFirestoreOnline();
  return onSnapshot(
    query(collection(db, GROUPS_COLLECTION), where('orgId', '==', orgId)),
    (snapshot) => {
      try {
        const groups = snapshot.docs
          .map((d) => mapGroup(d.id, d.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        onUpdate(groups);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export async function createContactGroup(
  actor: UserProfile,
  input: { name: string; contactIds: string[] }
): Promise<string> {
  if (!input.name.trim()) throw new Error('Grup adı zorunludur.');
  if (input.contactIds.length === 0) throw new Error('En az bir kişi seçin.');

  await ensureFirestoreOnline();
  const ref = await addDoc(collection(db, GROUPS_COLLECTION), {
    orgId: actor.orgId,
    name: input.name.trim(),
    contactIds: input.contactIds,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteContactGroup(groupId: string): Promise<void> {
  await ensureFirestoreOnline();
  await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
}
