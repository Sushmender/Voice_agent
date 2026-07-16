import { create } from 'zustand';
import type {
  AgentState,
  SpeakingState,
  TranscriptMessage,
  ToolEvent,
  LatencyEntry,
} from '../types/agent';

interface SessionState {
  // Connection
  agentState: AgentState;
  speakingState: SpeakingState;
  isMuted: boolean;
  isVolumeOff: boolean;
  error: string | null;
  sessionDuration: number; // seconds

  // Content
  transcripts: TranscriptMessage[];
  toolEvents: ToolEvent[];
  latencyHistory: LatencyEntry[];

  // Actions
  setAgentState: (state: AgentState) => void;
  setSpeakingState: (state: SpeakingState) => void;
  setIsMuted: (muted: boolean) => void;
  setIsVolumeOff: (off: boolean) => void;
  setError: (err: string | null) => void;
  incrementDuration: () => void;
  resetDuration: () => void;

  addTranscript: (msg: TranscriptMessage) => void;
  updateTypingTranscript: (id: string, text: string, done: boolean) => void;
  clearTranscripts: () => void;

  addToolEvent: (evt: ToolEvent) => void;
  updateToolEvent: (id: string, update: Partial<ToolEvent>) => void;
  clearToolEvents: () => void;

  addLatencyEntry: (entry: LatencyEntry) => void;
  clearLatency: () => void;

  resetSession: () => void;
}

const initialState = {
  agentState: 'IDLE' as AgentState,
  speakingState: 'QUIET' as SpeakingState,
  isMuted: false,
  isVolumeOff: false,
  error: null,
  sessionDuration: 0,
  transcripts: [],
  toolEvents: [],
  latencyHistory: [],
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setAgentState: (state) => set({ agentState: state }),
  setSpeakingState: (state) => set({ speakingState: state }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setIsVolumeOff: (off) => set({ isVolumeOff: off }),
  setError: (err) => set({ error: err }),
  incrementDuration: () =>
    set((s) => ({ sessionDuration: s.sessionDuration + 1 })),
  resetDuration: () => set({ sessionDuration: 0 }),

  addTranscript: (msg) =>
    set((s) => ({ transcripts: [...s.transcripts, msg] })),

  updateTypingTranscript: (id, text, done) =>
    set((s) => ({
      transcripts: s.transcripts.map((t) =>
        t.id === id ? { ...t, text, isTyping: !done } : t
      ),
    })),

  clearTranscripts: () => set({ transcripts: [] }),

  addToolEvent: (evt) =>
    set((s) => ({ toolEvents: [...s.toolEvents, evt] })),

  updateToolEvent: (id, update) =>
    set((s) => ({
      toolEvents: s.toolEvents.map((e) =>
        e.id === id ? { ...e, ...update } : e
      ),
    })),

  clearToolEvents: () => set({ toolEvents: [] }),

  addLatencyEntry: (entry) =>
    set((s) => ({
      latencyHistory: [...s.latencyHistory.slice(-49), entry],
    })),

  clearLatency: () => set({ latencyHistory: [] }),

  resetSession: () => set(initialState),
}));
