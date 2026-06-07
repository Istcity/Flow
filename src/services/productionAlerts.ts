import { PRODUCTION_STAGES } from '@/constants/production';
import { ALERT_TYPE_LABELS } from '@/constants/alerts';
import { getProducedQuantity } from '@/services/productionProgress';
import {
  addWorkUnitsFrom,
  calendarDaysBetween,
  getWorkDayLabel,
  getWorkDayWeight,
  sumWorkUnitsBetween,
} from '@/utils/turkishWorkCalendar';
import type { Order, ProductionAlertDraft, ProductionEntry, ProductionStage } from '@/types';

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tam iş günü bazında günlük hedef (cumartesi/tatil ayrı hesaplanır). */
export function computeBaseDailyTarget(order: Order): number {
  if (order.dailyQuantityTarget && order.dailyQuantityTarget > 0) {
    return order.dailyQuantityTarget;
  }
  if (order.expectedDeliveryDate && order.startDate && order.targetQuantity > 0) {
    const workUnits = sumWorkUnitsBetween(order.startDate, order.expectedDeliveryDate);
    return Math.max(1, Math.ceil(order.targetQuantity / workUnits));
  }
  return 0;
}

/** Belirli bir gün için beklenen adet (cumartesi yarım, pazar/tatil sıfır). */
export function getDailyTargetForDate(order: Order, date: string): number {
  const weight = getWorkDayWeight(date);
  if (weight <= 0) return 0;

  const base = computeBaseDailyTarget(order);
  if (base <= 0) return 0;

  return Math.max(1, Math.round(base * weight));
}

/** Geriye dönük uyumluluk */
export function computeDailyTarget(order: Order, date = todayIso()): number {
  return getDailyTargetForDate(order, date);
}

export function getTodayProduction(entries: ProductionEntry[], date = todayIso()): number {
  return entries
    .filter((e) => e.date.slice(0, 10) === date)
    .reduce((sum, e) => sum + e.quantity, 0);
}

/** İş günü birimi başına ortalama üretim */
function averageProductionPerWorkUnit(
  entries: ProductionEntry[],
  sinceDate: string,
  untilDate: string
): number {
  const start = sinceDate.slice(0, 10);
  const end = untilDate.slice(0, 10);

  let total = 0;
  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    if (day >= start && day <= end) {
      total += entry.quantity;
    }
  }

  const workUnits = sumWorkUnitsBetween(start, end);
  if (workUnits <= 0) return 0;
  return total / workUnits;
}

function draft(
  order: Order,
  partial: Omit<ProductionAlertDraft, 'orgId' | 'orderId' | 'orderName' | 'active'>
): ProductionAlertDraft {
  return {
    orgId: order.orgId,
    orderId: order.id,
    orderName: order.orderName,
    active: true,
    ...partial,
  };
}

/** Sipariş + girişlerden aktif uyarıları hesaplar (iş takvimi dahil). */
export function evaluateOrderAlerts(order: Order, entries: ProductionEntry[]): ProductionAlertDraft[] {
  const alerts: ProductionAlertDraft[] = [];
  const today = todayIso();
  const produced = getProducedQuantity(order);
  const target = order.targetQuantity;

  if (target > 0 && produced > target) {
    alerts.push(
      draft(order, {
        type: 'quantity_over',
        severity: 'warning',
        title: ALERT_TYPE_LABELS.quantity_over,
        message: `Toplam üretim ${produced} adet; hedef ${target} adet (${produced - target} fazla).`,
        targetValue: target,
        actualValue: produced,
        deltaValue: produced - target,
        referenceDate: today,
        alertKey: `${order.id}:quantity_over`,
      })
    );
  }

  const stageKeys: ProductionStage[] = ['kesim', 'dikim', 'utu', 'paket'];
  for (const stage of stageKeys) {
    const stageProduced = order.stageTotals[stage] ?? 0;
    if (target > 0 && stageProduced > target) {
      alerts.push(
        draft(order, {
          type: 'quantity_over',
          severity: 'warning',
          title: `${PRODUCTION_STAGES[stage]} — hedef üstü`,
          message: `${PRODUCTION_STAGES[stage]} aşamasında ${stageProduced} adet; hedef ${target} adet.`,
          targetValue: target,
          actualValue: stageProduced,
          deltaValue: stageProduced - target,
          referenceDate: today,
          alertKey: `${order.id}:quantity_over:${stage}`,
        })
      );
    }
  }

  if (order.expectedDeliveryDate && order.startDate && target > 0 && today >= order.startDate) {
    const totalWorkUnits = sumWorkUnitsBetween(order.startDate, order.expectedDeliveryDate);
    const elapsedEnd = today <= order.expectedDeliveryDate ? today : order.expectedDeliveryDate;
    const elapsedWorkUnits = sumWorkUnitsBetween(order.startDate, elapsedEnd);
    const expectedProduced = Math.floor((target * elapsedWorkUnits) / totalWorkUnits);

    if (produced < expectedProduced && today <= order.expectedDeliveryDate) {
      const gap = expectedProduced - produced;
      alerts.push(
        draft(order, {
          type: 'quantity_behind',
          severity: gap > target * 0.15 ? 'critical' : 'warning',
          title: ALERT_TYPE_LABELS.quantity_behind,
          message: `İş takvimine göre ${expectedProduced} adet olmalıydı; ${produced} adet üretildi (${gap} eksik). Pazar/tatil/bayram hariç, cumartesi yarım gün.`,
          targetValue: expectedProduced,
          actualValue: produced,
          deltaValue: gap,
          referenceDate: today,
          alertKey: `${order.id}:quantity_behind:${today}`,
        })
      );
    }
  }

  const todayWeight = getWorkDayWeight(today);
  const dailyTarget = getDailyTargetForDate(order, today);

  if (dailyTarget > 0 && today >= order.startDate && todayWeight > 0) {
    const todayProd = getTodayProduction(entries, today);
    if (todayProd < dailyTarget) {
      const gap = dailyTarget - todayProd;
      const dayNote =
        todayWeight === 0.5 ? ' (cumartesi — yarım gün hedefi)' : '';
      alerts.push(
        draft(order, {
          type: 'daily_target_miss',
          severity: gap > dailyTarget * 0.5 ? 'critical' : 'warning',
          title: ALERT_TYPE_LABELS.daily_target_miss,
          message: `Bugün ${todayProd} adet girildi; gün hedefi ${dailyTarget} adet${dayNote} (${gap} eksik).`,
          targetValue: dailyTarget,
          actualValue: todayProd,
          deltaValue: gap,
          referenceDate: today,
          alertKey: `${order.id}:daily_target_miss:${today}`,
        })
      );
    }
  }

  if (order.expectedDeliveryDate) {
    if (today > order.expectedDeliveryDate && produced < target) {
      const gap = target - produced;
      alerts.push(
        draft(order, {
          type: 'delivery_deviation',
          severity: 'critical',
          title: ALERT_TYPE_LABELS.delivery_deviation,
          message: `Teslim tarihi (${order.expectedDeliveryDate}) geçti; ${gap} adet eksik.`,
          targetValue: target,
          actualValue: produced,
          deltaValue: gap,
          referenceDate: today,
          alertKey: `${order.id}:delivery_deviation:overdue`,
        })
      );
    } else if (produced < target && order.startDate) {
      const prodPerUnit = averageProductionPerWorkUnit(entries, order.startDate, today);
      if (prodPerUnit > 0) {
        const remaining = target - produced;
        const workUnitsNeeded = remaining / prodPerUnit;
        const projectedFinish = addWorkUnitsFrom(today, workUnitsNeeded);

        if (projectedFinish > order.expectedDeliveryDate) {
          const slipDays = calendarDaysBetween(order.expectedDeliveryDate, projectedFinish);
          alerts.push(
            draft(order, {
              type: 'delivery_deviation',
              severity: slipDays > 3 ? 'critical' : 'warning',
              title: ALERT_TYPE_LABELS.delivery_deviation,
              message: `İş takvimine göre tahmini bitiş ${projectedFinish}; hedef teslim ${order.expectedDeliveryDate} (${slipDays} takvim günü gecikme).`,
              targetValue: 0,
              actualValue: slipDays,
              deltaValue: slipDays,
              referenceDate: today,
              alertKey: `${order.id}:delivery_deviation:projected`,
            })
          );
        }
      }
    }
  }

  return alerts;
}

export function countActiveAlertsByOrder(
  alerts: ProductionAlertDraft[] | { orderId: string; active: boolean }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const alert of alerts) {
    if (!alert.active) continue;
    counts[alert.orderId] = (counts[alert.orderId] ?? 0) + 1;
  }
  return counts;
}

export { getWorkDayLabel, getWorkDayWeight };
