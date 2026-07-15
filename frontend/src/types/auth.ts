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
  User_query: string;
  LLM_response: string;
  Tools_Used: string | null;
  session_id: string;
}

export interface Session {
  session_id: string;
  session_name: string;
  date: string;
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
