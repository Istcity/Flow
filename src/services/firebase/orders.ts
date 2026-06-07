import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, ensureFirestoreOnline } from './config';
import { writeAuditLog } from './auditLog';
import { EMPTY_STAGE_TOTALS } from '@/constants/production';
import { filterOrdersForUser } from '@/services/productionProgress';
import type { Order, ProductionStatus, StageTotals, UserProfile } from '@/types';

const ORDERS_COLLECTION = 'orders';

function parseStageTotals(data: Record<string, unknown>): StageTotals {
  const raw = data.stageTotals as Partial<StageTotals> | undefined;
  return {
    kesim: Number(raw?.kesim ?? 0),
    dikim: Number(raw?.dikim ?? 0),
    utu: Number(raw?.utu ?? 0),
    paket: Number(raw?.paket ?? 0),
  };
}

export function mapOrderDoc(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    orgId: String(data.orgId ?? ''),
    orderName: String(data.orderName ?? data.modelNo ?? ''),
    workshopName: String(data.workshopName ?? ''),
    startDate: String(data.startDate ?? ''),
    responsiblePersonName: String(data.responsiblePersonName ?? ''),
    targetQuantity: Number(data.targetQuantity ?? 0),
    dailyQuantityTarget:
      data.dailyQuantityTarget != null ? Number(data.dailyQuantityTarget) : undefined,
    expectedDeliveryDate: data.expectedDeliveryDate ? String(data.expectedDeliveryDate) : undefined,
    status: (data.status as ProductionStatus) ?? 'kesim',
    stageTotals: parseStageTotals(data),
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

export async function fetchAllOrders(orgId?: string): Promise<Order[]> {
  await ensureFirestoreOnline();
  const base = collection(db, ORDERS_COLLECTION);
  const snapshot = orgId
    ? await getDocs(query(base, where('orgId', '==', orgId)))
    : await getDocs(base);
  return snapshot.docs.map((d) => mapOrderDoc(d.id, d.data()));
}

export async function fetchOrder(orderId: string): Promise<Order | null> {
  await ensureFirestoreOnline();
  const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
  if (!snap.exists()) return null;
  return mapOrderDoc(snap.id, snap.data());
}

export async function createOrder(
  actor: UserProfile,
  input: {
    orderName: string;
    workshopName: string;
    startDate: string;
    responsiblePersonName: string;
    targetQuantity: number;
    dailyQuantityTarget?: number;
    expectedDeliveryDate?: string;
    status?: ProductionStatus;
  }
): Promise<string> {
  const payload = {
    orgId: actor.orgId,
    orderName: input.orderName.trim(),
    workshopName: input.workshopName.trim(),
    startDate: input.startDate,
    responsiblePersonName: input.responsiblePersonName.trim(),
    targetQuantity: input.targetQuantity,
    dailyQuantityTarget: input.dailyQuantityTarget && input.dailyQuantityTarget > 0
      ? input.dailyQuantityTarget
      : null,
    expectedDeliveryDate: input.expectedDeliveryDate?.trim() || null,
    status: input.status ?? 'kesim',
    stageTotals: EMPTY_STAGE_TOTALS,
    createdBy: actor.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, ORDERS_COLLECTION), payload);

  await writeAuditLog({
    userId: actor.id,
    userDisplayName: actor.displayName,
    action: 'insert',
    targetCollection: ORDERS_COLLECTION,
    targetId: ref.id,
    targetField: '*',
    newValue: payload,
  });

  return ref.id;
}

export async function updateOrder(
  actor: UserProfile,
  orderId: string,
  updates: Partial<
    Pick<
      Order,
      | 'orderName'
      | 'workshopName'
      | 'startDate'
      | 'responsiblePersonName'
      | 'targetQuantity'
      | 'dailyQuantityTarget'
      | 'expectedDeliveryDate'
      | 'status'
    >
  >
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    userId: actor.id,
    userDisplayName: actor.displayName,
    action: 'update',
    targetCollection: ORDERS_COLLECTION,
    targetId: orderId,
    targetField: Object.keys(updates).join(','),
    newValue: updates,
  });
}

export async function updateOrderStageTotals(orderId: string, stageTotals: StageTotals): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    stageTotals,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchOrdersByIds(orderIds: string[]): Promise<Order[]> {
  if (orderIds.length === 0) return [];
  const results = await Promise.all(orderIds.map((id) => fetchOrder(id)));
  return results.filter((o): o is Order => o !== null);
}

export async function fetchOrdersForUser(profile: UserProfile): Promise<Order[]> {
  const all = await fetchAllOrders(profile.orgId);
  return filterOrdersForUser(all, profile);
}

/** iOS ve Android aynı Firestore verisini anlık paylaşır */
export function subscribeOrdersForUser(
  profile: UserProfile,
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!profile.orgId) {
    onUpdate([]);
    return () => {};
  }

  void ensureFirestoreOnline();
  return onSnapshot(
    query(collection(db, ORDERS_COLLECTION), where('orgId', '==', profile.orgId)),
    (snapshot) => {
      try {
        const all = snapshot.docs.map((d) => mapOrderDoc(d.id, d.data()));
        onUpdate(filterOrdersForUser(all, profile));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export function subscribeOrder(
  orderId: string,
  onUpdate: (order: Order | null) => void,
  onError?: (error: Error) => void
): () => void {
  void ensureFirestoreOnline();
  return onSnapshot(
    doc(db, ORDERS_COLLECTION, orderId),
    (snap) => {
      try {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(mapOrderDoc(snap.id, snap.data()));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}
