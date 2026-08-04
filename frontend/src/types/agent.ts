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

// ─── Pipeline stage machine (drives ASR/LLM/TTS indicators) ───────────────────
export type PipelineStage =
  | 'IDLE'        // not connected
  | 'QUIET'       // connected, nothing happening
  | 'ASR_ACTIVE'  // user is speaking  → Groq Whisper transcribing
  | 'LLM_ACTIVE'  // user stopped      → Cerebras LLM thinking
  | 'TTS_ACTIVE'; // agent responding  → Cartesia TTS rendering

// ─── Transcript message ────────────────────────────────────────────────────────
export interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string; // ISO string
  isTyping?: boolean;    // true while agent is streaming
  isHistorical?: boolean; // true for pre-loaded past-session messages
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
  asr: number;       // from backend LatencyLoggerProcessor
  tts: number;       // from backend LatencyLoggerProcessor
  llm: number;
  tool: number;
  mongo_fetch: number;
  mongo_save: number;
  input_tokens: number;
  output_tokens: number;
  ttfb: number;      // client-side TTFB (kept for backward compat)
  total: number;     // from backend LatencyLoggerProcessor
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

export interface DCLatencyEvent {
  type: 'latency_event';
  turn: number;
  asr: number;
  tts: number;
  total: number;
  llm: number;
  tool: number;
  mongo_fetch: number;
  mongo_save: number;
  input_tokens: number;
  output_tokens: number;
  timestamp: string;
}

export type DCPayload = DCTranscript | DCToolEvent | DCLatencyEvent;
