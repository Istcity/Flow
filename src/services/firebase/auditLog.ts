import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { AuditAction, AuditLogEntry } from '@/types';

const AUDIT_LOGS_COLLECTION = 'auditLogs';

export interface AuditLogInput {
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  targetCollection: string;
  targetId: string;
  targetField: string;
  previousValue?: unknown;
  newValue?: unknown;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value ?? null;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
    ...input,
    previousValue: serializeValue(input.previousValue),
    newValue: serializeValue(input.newValue),
    timestamp: serverTimestamp(),
  });
}

export async function writeAuditLogsForChanges(
  base: Omit<AuditLogInput, 'targetField' | 'previousValue' | 'newValue'>,
  changes: Array<{ field: string; previousValue?: unknown; newValue?: unknown }>
): Promise<void> {
  await Promise.all(
    changes.map((change) =>
      writeAuditLog({
        ...base,
        targetField: change.field,
        previousValue: change.previousValue,
        newValue: change.newValue,
      })
    )
  );
}

export async function fetchAuditLogs(limitCount = 50): Promise<AuditLogEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db, AUDIT_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const timestamp =
      data.timestamp instanceof Timestamp
        ? data.timestamp.toDate().toISOString()
        : new Date().toISOString();

    return {
      id: docSnap.id,
      timestamp,
      userId: data.userId,
      userDisplayName: data.userDisplayName,
      action: data.action,
      targetCollection: data.targetCollection,
      targetId: data.targetId,
      targetField: data.targetField,
      previousValue: data.previousValue,
      newValue: data.newValue,
    } satisfies AuditLogEntry;
  });
}
