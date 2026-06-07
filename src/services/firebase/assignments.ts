import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { db, ensureFirestoreOnline } from './config';
import { generateInviteCode } from '@/constants/production';
import { upsertSavedContact } from './contacts';
import type { OrderAssignment, PendingAssignment, UserProfile, UserRole } from '@/types';

const ASSIGNMENTS_COLLECTION = 'orderAssignments';

function mapAssignment(id: string, data: Record<string, unknown>): OrderAssignment {
  return {
    id,
    orgId: String(data.orgId ?? ''),
    orderId: String(data.orderId ?? ''),
    orderName: String(data.orderName ?? ''),
    email: String(data.email ?? '').toLowerCase(),
    displayName: String(data.displayName ?? ''),
    role: data.role as OrderAssignment['role'],
    inviteCode: String(data.inviteCode ?? ''),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : String(data.createdAt ?? new Date().toISOString()),
    acceptedAt:
      data.acceptedAt instanceof Timestamp
        ? data.acceptedAt.toDate().toISOString()
        : data.acceptedAt
          ? String(data.acceptedAt)
          : undefined,
    userId: data.userId ? String(data.userId) : undefined,
  };
}

export async function createAssignment(
  actor: UserProfile,
  input: {
    orderId: string;
    orderName: string;
    email: string;
    displayName: string;
    role: Exclude<UserRole, 'admin'>;
  }
): Promise<OrderAssignment> {
  await ensureFirestoreOnline();

  const inviteCode = generateInviteCode();
  const payload = {
    orgId: actor.orgId,
    orderId: input.orderId,
    orderName: input.orderName,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    role: input.role,
    inviteCode,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), payload);

  const assignment: OrderAssignment = {
    id: ref.id,
    orgId: actor.orgId,
    orderId: input.orderId,
    orderName: input.orderName,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    role: input.role,
    inviteCode,
    createdAt: new Date().toISOString(),
  };

  await upsertSavedContact(actor, {
    email: assignment.email,
    displayName: assignment.displayName,
    defaultRole: assignment.role,
  });

  return assignment;
}

export async function assignContactsToOrder(
  actor: UserProfile,
  orderId: string,
  orderName: string,
  contacts: PendingAssignment[],
  options?: { sendEmail?: boolean }
): Promise<OrderAssignment[]> {
  const results: OrderAssignment[] = [];
  for (const contact of contacts) {
    const assignment = await createAssignment(actor, {
      orderId,
      orderName,
      email: contact.email,
      displayName: contact.displayName,
      role: contact.role,
    });
    if (options?.sendEmail !== false) {
      await sendInviteEmail(assignment);
    }
    results.push(assignment);
  }
  return results;
}

export async function sendInviteEmail(assignment: OrderAssignment): Promise<void> {
  const subject = encodeURIComponent(`FLOW — ${assignment.orderName} daveti`);
  const body = encodeURIComponent(
    `Merhaba ${assignment.displayName},\n\n` +
      `"${assignment.orderName}" siparişi için FLOW uygulamasına davet edildiniz.\n\n` +
      `Giriş kodunuz: ${assignment.inviteCode}\n` +
      `E-posta: ${assignment.email}\n\n` +
      `Uygulamada e-posta adresiniz ve bu kod ile giriş yapın.`
  );
  const url = `mailto:${assignment.email}?subject=${subject}&body=${body}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch {
    // Mail uygulaması açılamazsa davet kodu yine ekranda gösterilir
  }
}

export async function findAssignmentByEmailAndCode(
  email: string,
  inviteCode: string
): Promise<OrderAssignment | null> {
  await ensureFirestoreOnline();
  const normalizedEmail = email.trim().toLowerCase();
  const snapshot = await getDocs(
    query(
      collection(db, ASSIGNMENTS_COLLECTION),
      where('email', '==', normalizedEmail),
      where('inviteCode', '==', inviteCode.trim())
    )
  );

  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return mapAssignment(docSnap.id, docSnap.data());
}

export async function fetchAllAssignments(): Promise<OrderAssignment[]> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
  return snapshot.docs.map((d) => mapAssignment(d.id, d.data()));
}

export async function fetchAssignmentsForOrder(orderId: string): Promise<OrderAssignment[]> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(
    query(collection(db, ASSIGNMENTS_COLLECTION), where('orderId', '==', orderId))
  );
  return snapshot.docs.map((d) => mapAssignment(d.id, d.data()));
}

export function subscribeAssignmentsForOrder(
  orderId: string,
  onUpdate: (assignments: OrderAssignment[]) => void,
  onError?: (error: Error) => void
): () => void {
  void ensureFirestoreOnline();
  return onSnapshot(
    query(collection(db, ASSIGNMENTS_COLLECTION), where('orderId', '==', orderId)),
    (snapshot) => {
      try {
        onUpdate(snapshot.docs.map((d) => mapAssignment(d.id, d.data())));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export async function fetchAssignmentsForEmail(email: string): Promise<OrderAssignment[]> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(
    query(collection(db, ASSIGNMENTS_COLLECTION), where('email', '==', email.trim().toLowerCase()))
  );
  return snapshot.docs.map((d) => mapAssignment(d.id, d.data()));
}

export async function markAssignmentAccepted(
  assignmentId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, ASSIGNMENTS_COLLECTION, assignmentId), {
    userId,
    acceptedAt: serverTimestamp(),
  });
}

export async function getAssignedOrderIdsForEmail(email: string): Promise<string[]> {
  const assignments = await fetchAssignmentsForEmail(email);
  return [...new Set(assignments.map((a) => a.orderId))];
}
