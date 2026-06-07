import type { ProductionAlertType } from '@/types';

export const ALERT_TYPE_LABELS: Record<ProductionAlertType, string> = {
  quantity_behind: 'Adet hedef gerisinde',
  daily_target_miss: 'Gün hedefi tutmadı',
  quantity_over: 'Hedef üstü üretim',
  delivery_deviation: 'Teslim tarihi şaşması',
};

export const ALERT_SEVERITY_LABELS = {
  warning: 'Uyarı',
  critical: 'Kritik',
} as const;
