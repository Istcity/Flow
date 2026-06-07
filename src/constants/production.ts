import type { OperationType, ProductionStage, ProductionStatus } from '@/types';

export const EDIT_LOCK_MINUTES = 10;

export const PRODUCTION_STATUSES: Record<ProductionStatus, string> = {
  kesim: 'Kesim',
  dikim: 'Dikim',
  utu: 'Ütü',
  paket: 'Paket',
};

export const PRODUCTION_STAGES: Record<ProductionStage, string> = {
  kesim: 'KESİM',
  dikim: 'DİKİM',
  utu: 'ÜTÜ',
  paket: 'PAKET',
};

export const OPERATION_TYPES: OperationType[] = ['Kesim', 'Dikim', 'Ütü', 'Paket'];

export const OPERATION_TO_STAGE: Record<OperationType, ProductionStage> = {
  Kesim: 'kesim',
  Dikim: 'dikim',
  Ütü: 'utu',
  Paket: 'paket',
};

export const EMPTY_STAGE_TOTALS = {
  kesim: 0,
  dikim: 0,
  utu: 0,
  paket: 0,
};

export function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
