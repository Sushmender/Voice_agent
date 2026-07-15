import api from '../../../lib/axios';
import type {
  Token,
  User,
  ConversationsResponse,
  SessionsResponse,
} from '../../../types/auth';

// ── Login ──────────────────────────────────────────────────────────────────────
// FastAPI OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
export async function login(email: string, password: string): Promise<Token> {
  const params = new URLSearchParams();
  params.append('username', email); // FastAPI OAuth2 uses "username"
  params.append('password', password);

  const { data } = await api.post<Token>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

// ── Signup ─────────────────────────────────────────────────────────────────────
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const { data } = await api.post<User>('/auth/signup', { name, email, password });
  return data;
}

// ── Get current user ───────────────────────────────────────────────────────────
export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

// ── Conversations ──────────────────────────────────────────────────────────────
export async function getConversations(
  sessionId?: string,
  limit = 200
): Promise<ConversationsResponse> {
  const params: Record<string, string | number> = { limit };
  if (sessionId) params.session_id = sessionId;
  const { data } = await api.get<ConversationsResponse>('/auth/conversations', { params });
  return data;
}

// ── Sessions ───────────────────────────────────────────────────────────────────
export async function getSessions(): Promise<SessionsResponse> {
  const { data } = await api.get<SessionsResponse>('/auth/sessions');
  return data;
}
