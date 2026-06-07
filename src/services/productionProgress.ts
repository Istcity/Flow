import { PRODUCTION_STAGES } from '@/constants/production';
import type {
  Order,
  ProductionEntry,
  ProductionStage,
  StageProgress,
  StageTotals,
  UserProfile,
} from '@/types';
import { canViewOrder } from '@/services/rbac';

const STAGE_ORDER: ProductionStage[] = ['kesim', 'dikim', 'utu', 'paket'];

export function getProducedQuantity(order: Order): number {
  const t = order.stageTotals;
  return Math.max(t.paket, t.utu, t.dikim, t.kesim);
}

export function getOrderOverallProgress(order: Order): number {
  if (order.targetQuantity <= 0) return 0;
  return Math.min(100, Math.round((getProducedQuantity(order) / order.targetQuantity) * 100));
}

export function calculateStageProgress(order: Order, totals?: StageTotals): StageProgress[] {
  const stageTotals = totals ?? order.stageTotals;
  const target = order.targetQuantity;

  return STAGE_ORDER.map((stage) => {
    const produced = stageTotals[stage] ?? 0;
    const percent = target <= 0 ? 0 : Math.min(100, Math.round((produced / target) * 100));
    return {
      stage,
      label: PRODUCTION_STAGES[stage],
      produced,
      target,
      percent,
    };
  });
}

export function aggregateStageTotals(entries: ProductionEntry[]): StageTotals {
  const totals = { kesim: 0, dikim: 0, utu: 0, paket: 0 };
  for (const entry of entries) {
    const stage = entry.operationType === 'Kesim' ? 'kesim'
      : entry.operationType === 'Dikim' ? 'dikim'
      : entry.operationType === 'Ütü' ? 'utu'
      : 'paket';
    totals[stage] += entry.quantity;
  }
  return totals;
}

export function filterOrdersForUser(orders: Order[], profile: UserProfile): Order[] {
  if (profile.role === 'admin') return orders;
  return orders.filter((o) => canViewOrder(profile, o.id));
}
