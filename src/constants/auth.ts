import type { UserProfile } from '@/types';

/** Google girişi — tüm süreçler tamamlanınca true yapın */
export const ENABLE_GOOGLE_AUTH = false;

export const GUEST_SESSION_KEY = '@flow/guest_session';

export const GUEST_PROFILE: UserProfile = {
  id: 'guest-local',
  email: '',
  displayName: 'Misafir',
  role: 'workshop',
  orgId: '',
};
