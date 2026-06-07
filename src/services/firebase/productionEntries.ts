import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, ensureFirestoreOnline } from './config';
import { writeAuditLog } from './auditLog';
import { updateOrderStageTotals, fetchOrder } from './orders';
import { aggregateStageTotals } from '@/services/productionProgress';
import { syncOrderAlerts } from './alerts';
import { canEditProductionEntry } from '@/services/rbac';
import type { OperationType, ProductionEntry, StageTotals, UserProfile } from '@/types';

const ORDERS_COLLECTION = 'orders';
const ENTRIES_SUB = 'productionEntries';

function entriesRef(orderId: string) {
  return collection(db, ORDERS_COLLECTION, orderId, ENTRIES_SUB);
}

function mapEntry(orderId: string, id: string, data: Record<string, unknown>): ProductionEntry {
  let dateStr = '';
  if (data.date instanceof Timestamp) {
    dateStr = data.date.toDate().toISOString().slice(0, 10);
  } else {
    dateStr = String(data.date ?? '').slice(0, 10);
  }

  return {
    id,
    orderId,
    operationType: data.operationType as OperationType,
    quantity: Number(data.quantity ?? 0),
    date: dateStr,
    note: data.note ? String(data.note) : undefined,
    userId: String(data.userId ?? ''),
    userDisplayName: String(data.userDisplayName ?? ''),
    userRole: data.userRole as ProductionEntry['userRole'],
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : String(data.createdAt ?? new Date().toISOString()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
          ? String(data.updatedAt)
          : undefined,
  };
}

export async function fetchAllProductionEntries(): Promise<ProductionEntry[]> {
  await ensureFirestoreOnline();
  const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION));
  const all: ProductionEntry[] = [];
  for (const orderDoc of ordersSnap.docs) {
    const entries = await fetchProductionEntries(orderDoc.id);
    all.push(...entries);
  }
  return all;
}

export async function fetchProductionEntries(orderId: string): Promise<ProductionEntry[]> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(query(entriesRef(orderId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => mapEntry(orderId, d.id, d.data()));
}

export function subscribeProductionEntries(
  orderId: string,
  onUpdate: (entries: ProductionEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!orderId) {
    onUpdate([]);
    return () => {};
  }
  void ensureFirestoreOnline();
  return onSnapshot(
    query(entriesRef(orderId), orderBy('createdAt', 'desc')),
    (snapshot) => {
      try {
        onUpdate(snapshot.docs.map((d) => mapEntry(orderId, d.id, d.data())));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

async function recalculateAndSaveTotals(orderId: string): Promise<StageTotals> {
  const entries = await fetchProductionEntries(orderId);
  const totals = aggregateStageTotals(entries);
  await updateOrderStageTotals(orderId, totals);
  const order = await fetchOrder(orderId);
  if (order) {
    await syncOrderAlerts({ ...order, stageTotals: totals }, entries).catch(() => {});
  }
  return totals;
}

export async function addProductionEntry(
  actor: UserProfile,
  orderId: string,
  input: {
    operationType: OperationType;
    quantity: number;
    date: string;
    note?: string;
  }
): Promise<string> {
  if (input.quantity <= 0) throw new Error('Adet sıfırdan büyük olmalıdır.');

  await ensureFirestoreOnline();

  const ref = await addDoc(entriesRef(orderId), {
    operationType: input.operationType,
    quantity: input.quantity,
    date: Timestamp.fromDate(new Date(`${input.date}T12:00:00`)),
    note: input.note?.trim() || null,
    userId: actor.id,
    userDisplayName: actor.displayName,
    userRole: actor.role,
    createdAt: serverTimestamp(),
  });

  await recalculateAndSaveTotals(orderId);

  await writeAuditLog({
    userId: actor.id,
    userDisplayName: actor.displayName,
    action: 'insert',
    targetCollection: `${ORDERS_COLLECTION}/${orderId}/${ENTRIES_SUB}`,
    targetId: ref.id,
    targetField: input.operationType,
    newValue: input.quantity,
  });

  return ref.id;
}

export async function updateProductionEntry(
  actor: UserProfile,
  orderId: string,
  entryId: string,
  entry: ProductionEntry,
  updates: { quantity?: number; note?: string; date?: string }
): Promise<void> {
  if (!canEditProductionEntry(actor, entry)) {
    throw new Error('Düzenleme süresi doldu. Yalnızca yönetici düzeltebilir.');
  }

  await ensureFirestoreOnline();

  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.quantity != null) payload.quantity = updates.quantity;
  if (updates.note !== undefined) payload.note = updates.note || null;
  if (updates.date) payload.date = Timestamp.fromDate(new Date(`${updates.date}T12:00:00`));

  await updateDoc(doc(db, ORDERS_COLLECTION, orderId, ENTRIES_SUB, entryId), payload);
  await recalculateAndSaveTotals(orderId);

  await writeAuditLog({
    userId: actor.id,
    userDisplayName: actor.displayName,
    action: 'update',
    targetCollection: `${ORDERS_COLLECTION}/${orderId}/${ENTRIES_SUB}`,
    targetId: entryId,
    targetField: Object.keys(updates).join(','),
    newValue: updates,
  });
}

export async function deleteProductionEntry(
  actor: UserProfile,
  orderId: string,
  entryId: string,
  entry: ProductionEntry
): Promise<void> {
  if (!canEditProductionEntry(actor, entry)) {
    throw new Error('Silme süresi doldu. Yalnızca yönetici silebilir.');
  }

  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId, ENTRIES_SUB, entryId));
  await recalculateAndSaveTotals(orderId);
}
