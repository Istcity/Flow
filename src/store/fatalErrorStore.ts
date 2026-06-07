import { create } from 'zustand';

interface FatalErrorState {
  error: Error | null;
  setFatalError: (error: Error) => void;
  clearFatalError: () => void;
}

export const useFatalErrorStore = create<FatalErrorState>((set) => ({
  error: null,
  setFatalError: (error) => set({ error }),
  clearFatalError: () => set({ error: null }),
}));
