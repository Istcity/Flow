import {
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, ensureFirestoreOnline } from './config';
import { evaluateOrderAlerts } from '@/services/productionAlerts';
import { filterOrdersForUser } from '@/services/productionProgress';
import type { Order, ProductionAlert, ProductionAlertDraft, ProductionEntry, UserProfile } from '@/types';

const ALERTS_COLLECTION = 'productionAlerts';

function mapAlert(id: string, data: Record<string, unknown>): ProductionAlert {
  return {
    id,
    orgId: String(data.orgId ?? ''),
    orderId: String(data.orderId ?? ''),
    orderName: String(data.orderName ?? ''),
    type: data.type as ProductionAlert['type'],
    severity: data.severity as ProductionAlert['severity'],
    title: String(data.title ?? ''),
    message: String(data.message ?? ''),
    targetValue: data.targetValue != null ? Number(data.targetValue) : undefined,
    actualValue: data.actualValue != null ? Number(data.actualValue) : undefined,
    deltaValue: data.deltaValue != null ? Number(data.deltaValue) : undefined,
    referenceDate: String(data.referenceDate ?? ''),
    alertKey: String(data.alertKey ?? ''),
    active: Boolean(data.active),
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

/** Üretim girişi sonrası uyarıları Firestore'a yazar — tüm kullanıcılara anlık bildirim. */
export async function syncOrderAlerts(order: Order, entries: ProductionEntry[]): Promise<void> {
  await ensureFirestoreOnline();

  const evaluated = evaluateOrderAlerts(order, entries);
  const activeKeys = new Set(evaluated.map((a) => a.alertKey));

  const existingSnap = await getDocs(
    query(collection(db, ALERTS_COLLECTION), where('orderId', '==', order.id))
  );

  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const draft of evaluated) {
    const existing = existingSnap.docs.find((d) => d.data().alertKey === draft.alertKey);
    const ref = existing
      ? doc(db, ALERTS_COLLECTION, existing.id)
      : doc(collection(db, ALERTS_COLLECTION));

    batch.set(
      ref,
      {
        ...draft,
        active: true,
        updatedAt: now,
        ...(existing ? {} : { createdAt: now }),
      },
      { merge: true }
    );
  }

  for (const existingDoc of existingSnap.docs) {
    const key = String(existingDoc.data().alertKey ?? '');
    const isActive = Boolean(existingDoc.data().active);
    if (!activeKeys.has(key) && isActive) {
      batch.update(doc(db, ALERTS_COLLECTION, existingDoc.id), {
        active: false,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
}

export function subscribeAlertsForUser(
  profile: UserProfile,
  onUpdate: (alerts: ProductionAlert[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!profile.orgId) {
    onUpdate([]);
    return () => {};
  }

  void ensureFirestoreOnline();
  return onSnapshot(
    query(
      collection(db, ALERTS_COLLECTION),
      where('orgId', '==', profile.orgId),
      where('active', '==', true)
    ),
    (snapshot) => {
      try {
        let alerts = snapshot.docs.map((d) => mapAlert(d.id, d.data()));
        if (profile.role !== 'admin') {
          const allowed = new Set(profile.assignedOrderIds ?? []);
          alerts = alerts.filter((a) => allowed.has(a.orderId));
        }
        alerts.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        onUpdate(alerts);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export function subscribeAlertsForOrder(
  orderId: string,
  onUpdate: (alerts: ProductionAlert[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!orderId) {
    onUpdate([]);
    return () => {};
  }

  void ensureFirestoreOnline();
  return onSnapshot(
    query(
      collection(db, ALERTS_COLLECTION),
      where('orderId', '==', orderId),
      where('active', '==', true)
    ),
    (snapshot) => {
      try {
        const alerts = snapshot.docs
          .map((d) => mapAlert(d.id, d.data()))
          .sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        onUpdate(alerts);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
  );
}

export function filterAlertsForOrders(
  alerts: ProductionAlert[],
  orders: Order[],
  profile: UserProfile
): ProductionAlert[] {
  const visibleOrders = filterOrdersForUser(orders, profile);
  const orderIds = new Set(visibleOrders.map((o) => o.id));
  return alerts.filter((a) => orderIds.has(a.orderId));
}
