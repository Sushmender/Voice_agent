import { toast } from 'sonner';

const baseStyle = {
  background: '#0d1018',
  border: '1px solid rgba(99,102,241,0.18)',
  color: '#f0f4ff',
  fontFamily: "'Inter', sans-serif",
  fontSize: '13px',
};

export const toasts = {
  connected: () =>
    toast.success('Connected to agent', {
      description: 'Your AI voice assistant is ready.',
      style: { ...baseStyle, borderLeft: '3px solid #22c55e' },
      duration: 3000,
    }),

  disconnected: () =>
    toast.info('Session ended', {
      description: 'You have disconnected from the agent.',
      style: { ...baseStyle, borderLeft: '3px solid #3b82f6' },
      duration: 3000,
    }),

  connectionLost: () =>
    toast.error('Connection lost', {
      description: 'Please retry to reconnect.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: Infinity,
    }),

  reconnecting: () =>
    toast.warning('Reconnecting…', {
      description: 'Connection interrupted, trying to restore.',
      style: { ...baseStyle, borderLeft: '3px solid #f59e0b' },
      duration: Infinity,
    }),

  reconnected: () =>
    toast.success('Reconnected', {
      description: 'Session restored successfully.',
      style: { ...baseStyle, borderLeft: '3px solid #22c55e' },
      duration: 3000,
    }),

  agentTimeout: () =>
    toast.error('Agent took too long', {
      description: 'The agent pipeline timed out. Please retry.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: Infinity,
    }),

  tokenError: (msg?: string) =>
    toast.error('Failed to start session', {
      description: msg ?? 'Could not obtain a connection token.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: Infinity,
    }),

  micDenied: () =>
    toast.error('Microphone access denied', {
      description: 'Please allow mic access in your browser settings.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: Infinity,
    }),

  micNotFound: () =>
    toast.error('No microphone detected', {
      description: 'Please connect a microphone and try again.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: 5000,
    }),

  sessionExpired: () =>
    toast.error('Session expired', {
      description: 'Please sign in again.',
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      duration: 4000,
    }),

  toolUsed: (toolName: string) =>
    toast.info(`Tool: ${toolName}`, {
      description: 'Agent executed a tool action.',
      style: { ...baseStyle, borderLeft: '3px solid #6366f1' },
      duration: 3000,
    }),

  copied: () =>
    toast.success('Copied to clipboard', {
      style: { ...baseStyle, borderLeft: '3px solid #22c55e' },
      duration: 2000,
    }),

  dismiss: toast.dismiss,
};
