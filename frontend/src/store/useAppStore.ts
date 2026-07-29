import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';

// Key used by ConsolePage to persist the active room name.
// Must be cleared on every logout to prevent cross-user session contamination.
const ROOM_NAME_LS_KEY = 'voice_agent_room_name';

interface AppState {
  user: User | null;
  token: string | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => {
        // Always clear the stored room name so the next user (or the same
        // user re-logging in) never inherits a stale/foreign session.
        localStorage.removeItem(ROOM_NAME_LS_KEY);
        set({ user: null, token: null });
      },
    }),
    {
      name: 'voice-agent-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
