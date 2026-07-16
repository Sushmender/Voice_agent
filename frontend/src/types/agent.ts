// ─── Connection state machine (§11) ───────────────────────────────────────────
export type AgentState =
  | 'IDLE'
  | 'CONNECTING'
  | 'WARMING_UP'
  | 'CONNECTED'
  | 'ERROR';

export type SpeakingState =
  | 'QUIET'
  | 'LISTENING'
  | 'SPEAKING'
  | 'INTERRUPTED';

// ─── Transcript message ────────────────────────────────────────────────────────
export interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string; // ISO string
  isTyping?: boolean; // true while agent is streaming
}

// ─── Tool event ────────────────────────────────────────────────────────────────
export interface ToolEvent {
  id: string;
  name: string;
  status: 'running' | 'success' | 'error';
  output_preview?: string;
  timestamp: string;
  turn?: number;
}

// ─── Latency tracking ─────────────────────────────────────────────────────────
export interface LatencyEntry {
  turn: number;
  ttfb: number;      // ms to first agent byte
  total: number;     // ms to end of agent utterance
  timestamp: string;
}

// ─── DataChannel payload shapes ───────────────────────────────────────────────
export interface DCTranscript {
  type: 'transcript';
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  turn?: number;
  tool_used?: string | null;
}

export interface DCToolEvent {
  type: 'tool_event';
  name: string;
  status: 'success' | 'error';
  output_preview?: string;
  timestamp: string;
  turn?: number;
}

export type DCPayload = DCTranscript | DCToolEvent;
