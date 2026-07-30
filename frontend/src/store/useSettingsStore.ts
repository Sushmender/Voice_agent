import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  selectedVoiceId: string;
  devMode: boolean;
  systemPromptOverride: string;
  responseStyle: number; // 0.0 = ultra-concise, 0.5 = balanced, 1.0 = detailed

  setVoiceId: (id: string) => void;
  toggleDevMode: () => void;
  setSystemPromptOverride: (val: string) => void;
  setResponseStyle: (val: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedVoiceId: 'aria',
      devMode: false,
      systemPromptOverride: '',
      responseStyle: 0.5,

      setVoiceId: (id) => set({ selectedVoiceId: id }),
      toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),
      setSystemPromptOverride: (val) => set({ systemPromptOverride: val }),
      setResponseStyle: (val) => set({ responseStyle: val }),
    }),
    {
      name: 'voice-agent-settings',
    }
  )
);
