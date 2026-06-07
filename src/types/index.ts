export type UserRole = 'admin' | 'tracker' | 'workshop';

export type ProductionStatus = 'kesim' | 'dikim' | 'utu' | 'paket';

export type ProductionStage = 'kesim' | 'dikim' | 'utu' | 'paket';

export type OperationType = 'Kesim' | 'Dikim' | 'Ütü' | 'Paket';

export type AuditAction = 'insert' | 'update';

export type ProductionAlertType =
  | 'quantity_behind'
  | 'daily_target_miss'
  | 'quantity_over'
  | 'delivery_deviation';

export type AlertSeverity = 'warning' | 'critical';

export interface ProductionAlert {
  id: string;
  orgId: string;
  orderId: string;
  orderName: string;
  type: ProductionAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  targetValue?: number;
  actualValue?: number;
  deltaValue?: number;
  referenceDate: string;
  alertKey: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionAlertDraft {
  orgId: string;
  orderId: string;
  orderName: string;
  type: ProductionAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  targetValue?: number;
  actualValue?: number;
  deltaValue?: number;
  referenceDate: string;
  alertKey: string;
  active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  orgId: string;
  organizationName?: string;
  assignedOrderIds?: string[];
}

export interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface StageTotals {
  kesim: number;
  dikim: number;
  utu: number;
  paket: number;
}

export interface StageProgress {
  stage: ProductionStage;
  label: string;
  produced: number;
  target: number;
  percent: number;
}

export interface Order {
  id: string;
  orgId: string;
  orderName: string;
  workshopName: string;
  startDate: string;
  responsiblePersonName: string;
  targetQuantity: number;
  /** Günlük hedef adet; boşsa teslim tarihine göre otomatik hesaplanır */
  dailyQuantityTarget?: number;
  expectedDeliveryDate?: string;
  status: ProductionStatus;
  stageTotals: StageTotals;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAssignment {
  id: string;
  orgId: string;
  orderId: string;
  orderName: string;
  email: string;
  displayName: string;
  role: Exclude<UserRole, 'admin'>;
  inviteCode: string;
  createdAt: string;
  acceptedAt?: string;
  userId?: string;
}

/** Yönetici rehberi — daha önce atanan kişiler */
export interface SavedContact {
  id: string;
  orgId: string;
  email: string;
  displayName: string;
  defaultRole: Exclude<UserRole, 'admin'>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Kayıtlı kişilerden oluşturulan grup */
export interface ContactGroup {
  id: string;
  orgId: string;
  name: string;
  contactIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingAssignment {
  email: string;
  displayName: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface ProductionEntry {
  id: string;
  orderId: string;
  operationType: OperationType;
  quantity: number;
  date: string;
  note?: string;
  userId: string;
  userDisplayName: string;
  userRole: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  targetCollection: string;
  targetId: string;
  targetField: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface ExportPayload {
  version: string;
  exportedAt: string;
  orders: Order[];
  productionEntries: ProductionEntry[];
  assignments: OrderAssignment[];
  auditLogs: AuditLogEntry[];
}
