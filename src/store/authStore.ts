import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { loginWithInvite, loginAsAdmin, registerAdmin as createAdminAccount, restoreSession, logOut, refreshProfileOrderIds, requestPasswordReset } from '@/services/firebase/inviteAuth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase/config';

interface AuthState {
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => () => void;
  loginInvite: (email: string, code: string) => Promise<boolean>;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  registerAdmin: (email: string, password: string, displayName: string, organizationName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: () => {
    restoreSession()
      .then((profile) => {
        set({ profile, isLoading: false, isInitialized: true });
      })
      .catch(() => {
        set({ isLoading: false, isInitialized: true });
      });

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        void restoreSession()
          .then((cached) => {
            if (!cached) set({ profile: null });
          })
          .catch(() => set({ profile: null }));
        return;
      }
      const { profile } = get();
      if (profile?.id === user.uid) return;
    });

    return unsub;
  },

  loginInvite: async (email, code) => {
    set({ error: null, isLoading: true });
    try {
      const profile = await loginWithInvite(email, code);
      set({ profile, isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Giriş başarısız.',
        isLoading: false,
      });
      return false;
    }
  },

  loginAdmin: async (email, password) => {
    set({ error: null, isLoading: true });
    try {
      const profile = await loginAsAdmin(email, password);
      set({ profile, isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Giriş başarısız.',
        isLoading: false,
      });
      return false;
    }
  },

  registerAdmin: async (email, password, displayName, organizationName) => {
    set({ error: null, isLoading: true });
    try {
      const profile = await createAdminAccount({ email, password, displayName, organizationName });
      set({ profile, isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Kayıt başarısız.',
        isLoading: false,
      });
      return false;
    }
  },

  resetPassword: async (email) => {
    set({ error: null, isLoading: true });
    try {
      await requestPasswordReset(email);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Sıfırlama e-postası gönderilemedi.',
        isLoading: false,
      });
      return false;
    }
  },

  refreshProfile: async () => {
    const { profile } = get();
    if (!profile) return;
    try {
      const updated = await refreshProfileOrderIds(profile);
      set({ profile: updated });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Profil güncellenemedi.',
      });
    }
  },

  signOut: async () => {
    try {
      await logOut();
      set({ profile: null, error: null });
    } catch (err) {
      set({
        profile: null,
        error: err instanceof Error ? err.message : 'Çıkış yapılamadı.',
      });
    }
  },

  setError: (error) => set({ error }),
}));

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.profile !== null);
}
