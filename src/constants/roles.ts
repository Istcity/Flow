import type { UserRole } from '@/types';

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: 'Admin',
    description: 'Tam yetki — sipariş tanımları ve tüm kayıtlar',
  },
  tracker: {
    label: 'Takip Elemanı',
    description: 'Sipariş görüntüleme ve günlük üretim girişi',
  },
  workshop: {
    label: 'Atölye',
    description: 'Sipariş görüntüleme ve günlük üretim girişi',
  },
};

/** Admin dışı roller bu alanları değiştiremez */
export const PROTECTED_ORDER_FIELDS = ['targetQuantity', 'expectedDeliveryDate'] as const;

export const APP_NAME = 'FLOW';
