import { motion, AnimatePresence } from 'framer-motion';
import type { AgentState, SpeakingState } from '../../../types/agent';

interface AgentStatusBadgeProps {
  agentState: AgentState;
  speakingState: SpeakingState;
}

interface BadgeConfig {
  color: string;
  label: string;
  dotAnimation?: string;
  showSpinner?: boolean;
}

function getConfig(
  agentState: AgentState,
  speakingState: SpeakingState
): BadgeConfig {
  if (agentState === 'IDLE') {
    return { color: '#4a5568', label: 'IDLE' };
  }
  if (agentState === 'CONNECTING') {
    return { color: '#f59e0b', label: 'CONNECTING...', showSpinner: true };
  }
  if (agentState === 'WARMING_UP') {
    return { color: '#f59e0b', label: 'WARMING UP', dotAnimation: 'dot-pulse 1s ease-in-out infinite' };
  }
  if (agentState === 'ERROR') {
    return { color: '#ef4444', label: 'ERROR' };
  }
  // CONNECTED states
  if (speakingState === 'SPEAKING') {
    return { color: '#6366f1', label: 'AGENT SPEAKING' };
  }
  if (speakingState === 'LISTENING') {
    return { color: '#3b82f6', label: 'LISTENING' };
  }
  // CONNECTED + QUIET / INTERRUPTED
  return { color: '#22c55e', label: 'LIVE' };
}

export function AgentStatusBadge({ agentState, speakingState }: AgentStatusBadgeProps) {
  const cfg = getConfig(agentState, speakingState);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${agentState}-${speakingState}`}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 12px 5px 9px',
          borderRadius: '100px',
          border: `1px solid ${cfg.color}40`,
          background: `${cfg.color}12`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: cfg.color,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Dot or spinner */}
        {cfg.showSpinner ? (
          <div style={{
            width: '12px', height: '12px',
            border: `2px solid ${cfg.color}40`,
            borderTopColor: cfg.color,
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
            flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: '7px', height: '7px',
            borderRadius: '50%',
            background: cfg.color,
            flexShrink: 0,
            animation: cfg.dotAnimation,
          }} />
        )}
        {cfg.label}
      </motion.div>
    </AnimatePresence>
  );
}
