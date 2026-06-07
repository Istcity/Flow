import type { UserRole, ProductionEntry, UserProfile, Order } from '@/types';
import { EDIT_LOCK_MINUTES } from '@/constants/production';

export const PROTECTED_ORDER_FIELDS = ['targetQuantity', 'expectedDeliveryDate', 'startDate'] as const;

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewOrder(
  profile: UserProfile,
  orderId: string,
  order?: Pick<Order, 'orgId'> | null
): boolean {
  if (order?.orgId && order.orgId !== profile.orgId) return false;
  if (profile.role === 'admin') return true;
  return profile.assignedOrderIds?.includes(orderId) ?? false;
}

export function canEditOrderDefinitions(role: UserRole): boolean {
  return role === 'admin';
}

export function canCreateOrder(role: UserRole): boolean {
  return role === 'admin';
}

export function canAssignPeople(role: UserRole): boolean {
  return role === 'admin';
}

export function canEditProductionEntry(profile: UserProfile, entry: ProductionEntry): boolean {
  if (profile.role === 'admin') return true;
  if (entry.userId !== profile.id) return false;

  const created = new Date(entry.createdAt).getTime();
  const lockAt = created + EDIT_LOCK_MINUTES * 60 * 1000;
  return Date.now() < lockAt;
}

export function getEntryLockRemainingMs(entry: ProductionEntry): number {
  const created = new Date(entry.createdAt).getTime();
  const lockAt = created + EDIT_LOCK_MINUTES * 60 * 1000;
  return Math.max(0, lockAt - Date.now());
}

export function isEntryLocked(profile: UserProfile, entry: ProductionEntry): boolean {
  return !canEditProductionEntry(profile, entry);
}
