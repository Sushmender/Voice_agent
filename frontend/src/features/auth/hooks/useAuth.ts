import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { login, signup, getMe, getSessions, getConversations } from '../api/authApi';
import { useAppStore } from '../../../store/useAppStore';
import { queryClient } from '../../../lib/queryClient';

// ── Login mutation ─────────────────────────────────────────────────────────────
export function useLoginMutation() {
  const { setToken } = useAppStore();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: async (data) => {
      setToken(data.access_token);
      // Fetch user profile immediately after login
      try {
        const me = await getMe();
        useAppStore.getState().setUser(me);
      } catch {
        // non-fatal
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => {
      toast.error('Login failed. Check your credentials and try again.');
    },
  });
}

// ── Signup mutation ────────────────────────────────────────────────────────────
export function useSignupMutation() {
  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => signup(name, email, password),
    onError: () => {
      toast.error('Signup failed. This email may already be registered.');
    },
  });
}

// ── Get current user ───────────────────────────────────────────────────────────
export function useGetMe() {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !!token,
    staleTime: 1000 * 60 * 10,
  });
}

// ── Sessions ───────────────────────────────────────────────────────────────────
export function useGetSessions() {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    enabled: !!token,
    staleTime: 1000 * 30,
  });
}

// ── Conversations ──────────────────────────────────────────────────────────────
export function useGetConversations(sessionId?: string) {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: ['conversations', sessionId],
    queryFn: () => getConversations(sessionId),
    enabled: !!token,
    staleTime: 1000 * 30,
  });
}
