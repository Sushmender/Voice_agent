import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  selectedVoiceId: string;
  devMode: boolean;
  setVoiceId: (id: string) => void;
  toggleDevMode: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedVoiceId: 'aria',
      devMode: false,
      setVoiceId: (id) => set({ selectedVoiceId: id }),
      toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),
    }),
    {
      name: 'voice-agent-settings',
    }
  )
);
