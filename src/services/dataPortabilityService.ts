import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { fetchAllOrders } from '@/services/firebase/orders';
import { fetchAllProductionEntries } from '@/services/firebase/productionEntries';
import { fetchAllAssignments } from '@/services/firebase/assignments';
import { fetchAuditLogs } from '@/services/firebase/auditLog';
import { EMPTY_STAGE_TOTALS } from '@/constants/production';
import type { ExportPayload, Order, ProductionEntry, OrderAssignment } from '@/types';

const EXPORT_VERSION = '3.0.0';
const ORDERS_COLLECTION = 'orders';
const ENTRIES_SUB = 'productionEntries';
const ASSIGNMENTS_COLLECTION = 'orderAssignments';

export async function buildExportPayload(): Promise<ExportPayload> {
  const [orders, productionEntries, assignments, auditLogs] = await Promise.all([
    fetchAllOrders(),
    fetchAllProductionEntries(),
    fetchAllAssignments(),
    fetchAuditLogs(500),
  ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    orders,
    productionEntries,
    assignments,
    auditLogs,
  };
}

export async function exportToJson(): Promise<string> {
  const payload = await buildExportPayload();
  const fileName = `flow-export-${Date.now()}.json`;
  const file = new File(Paths.document, fileName);

  file.create();
  file.write(JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'FLOW Veri Dışa Aktarımı',
    });
  }

  return file.uri;
}

export async function pickAndImportJson(): Promise<{ imported: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Dosya seçimi iptal edildi.');
  }

  const importFile = new File(result.assets[0].uri);
  const content = await importFile.text();
  const payload = JSON.parse(content) as ExportPayload;
  return importPayload(payload);
}

async function importPayload(payload: ExportPayload): Promise<{ imported: number }> {
  if (!payload.orders || !Array.isArray(payload.orders)) {
    throw new Error('Geçersiz dosya formatı.');
  }

  const batch = writeBatch(db);
  let count = 0;

  payload.orders.forEach((order: Order) => {
    const { id, createdAt, updatedAt, ...rest } = order;
    batch.set(doc(db, ORDERS_COLLECTION, id), {
      ...rest,
      stageTotals: rest.stageTotals ?? EMPTY_STAGE_TOTALS,
      updatedAt: serverTimestamp(),
    });
    count += 1;
  });

  payload.productionEntries?.forEach((entry: ProductionEntry) => {
    const { id, orderId, createdAt, updatedAt, ...rest } = entry;
    batch.set(doc(db, ORDERS_COLLECTION, orderId, ENTRIES_SUB, id), rest);
    count += 1;
  });

  payload.assignments?.forEach((assignment: OrderAssignment) => {
    const { id, createdAt, acceptedAt, ...rest } = assignment;
    batch.set(doc(db, ASSIGNMENTS_COLLECTION, id), rest);
    count += 1;
  });

  await batch.commit();
  return { imported: count };
}

/** @deprecated use exportToExcelFormat from exportService */
export async function exportToCsv(): Promise<string> {
  const { exportToExcelFormat } = await import('@/services/exportService');
  return exportToExcelFormat();
}
