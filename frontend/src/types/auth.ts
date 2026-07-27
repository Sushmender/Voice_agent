export interface User {
  id: string;
  name: string;
  email: string;
  voice_id: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginPayload {
  username: string; // OAuth2PasswordRequestForm uses "username" field (maps to email)
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface ConversationTurn {
  Date: string;
  Time: string;
  /** ISO 8601 UTC timestamp (e.g. "2026-07-25T12:46:43+00:00"). Present on records
   *  saved after the timestamp migration. Use this for local-time display;
   *  fall back to the raw Time string for legacy records. */
  timestamp?: string;
  User_query: string;
  LLM_response: string;
  Tools_Used: string | null;
  session_id: string;
}

export interface Session {
  session_id: string;
  session_name: string;
  date: string;
  /** ISO 8601 UTC timestamp of the most recent turn in this session. */
  timestamp?: string;
  turn_count: number;
}

export interface ConversationsResponse {
  conversations: ConversationTurn[];
  total: number;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}
