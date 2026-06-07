import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fetchAllOrders } from '@/services/firebase/orders';
import { fetchAllProductionEntries } from '@/services/firebase/productionEntries';
import { PRODUCTION_STATUSES } from '@/constants/production';
import { getProducedQuantity } from '@/services/productionProgress';
import type { Order } from '@/types';

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(values: unknown[]): string {
  return values.map(escapeCsv).join(',');
}

export async function exportToExcelFormat(): Promise<string> {
  const [orders, productionEntries] = await Promise.all([
    fetchAllOrders(),
    fetchAllProductionEntries(),
  ]);

  const lines: string[] = [];
  const exportedAt = new Date().toISOString();

  lines.push('# FLOW — Sipariş Takip Export');
  lines.push(`# exportedAt,${exportedAt}`);

  lines.push('');
  lines.push('SİPARİŞ ÖZET');
  lines.push(
    row([
      'SİPARİŞ',
      'ATÖLYE',
      'SORUMLU',
      'BAŞLANGIÇ',
      'HEDEF',
      'DURUM',
      'KESİM',
      'DİKİM',
      'ÜTÜ',
      'PAKET',
    ])
  );
  orders.forEach((order: Order) => {
    lines.push(
      row([
        order.orderName,
        order.workshopName,
        order.responsiblePersonName,
        order.startDate,
        order.targetQuantity,
        PRODUCTION_STATUSES[order.status],
        order.stageTotals.kesim,
        order.stageTotals.dikim,
        order.stageTotals.utu,
        order.stageTotals.paket,
      ])
    );
  });

  lines.push('');
  lines.push('TAKİP LİSTESİ');
  lines.push(row(['SİPARİŞ', 'TARİH', 'AŞAMA', 'ADET', 'KİŞİ', 'NOT']));
  productionEntries.forEach((entry) => {
    const order = orders.find((o) => o.id === entry.orderId);
    lines.push(
      row([
        order?.orderName ?? entry.orderId,
        entry.date,
        entry.operationType,
        entry.quantity,
        entry.userDisplayName,
        entry.note ?? '',
      ])
    );
  });

  lines.push('');
  lines.push('İLERLEME');
  lines.push(row(['SİPARİŞ', 'ÜRETİLEN', 'HEDEF', 'KALAN']));
  orders.forEach((order) => {
    const produced = getProducedQuantity(order);
    lines.push(
      row([order.orderName, produced, order.targetQuantity, order.targetQuantity - produced])
    );
  });

  const fileName = `flow-export-${Date.now()}.csv`;
  const file = new File(Paths.document, fileName);
  file.create();
  file.write(lines.join('\n'));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: "FLOW — Excel'e Aktar",
      UTI: 'public.comma-separated-values-text',
    });
  }

  return file.uri;
}
