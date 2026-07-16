import { motion } from 'framer-motion';
import { Mic, MicOff, Square, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { AgentState } from '../../../types/agent';
import { useSessionStore } from '../../../store/useSessionStore';

interface ControlBarProps {
  agentState: AgentState;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onToggleVolume: () => void;
}

export function ControlBar({
  agentState,
  onConnect,
  onDisconnect,
  onToggleMute,
  onToggleVolume,
}: ControlBarProps) {
  const isMuted = useSessionStore((s) => s.isMuted);
  const isVolumeOff = useSessionStore((s) => s.isVolumeOff);

  const isIdle = agentState === 'IDLE' || agentState === 'ERROR';
  const isConnecting = agentState === 'CONNECTING' || agentState === 'WARMING_UP';
  const isConnected = agentState === 'CONNECTED';
  const controlsDisabled = !isConnected;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      {/* Mute / Unmute */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onToggleMute}
        disabled={controlsDisabled}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`btn-icon-circle ${isMuted ? 'muted' : ''}`}
        style={{
          width: '52px',
          height: '52px',
          opacity: controlsDisabled ? 0.38 : 1,
          cursor: controlsDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isMuted ? (
          <MicOff size={20} color={controlsDisabled ? '#4a5568' : '#ef4444'} />
        ) : (
          <Mic size={20} color={controlsDisabled ? '#4a5568' : 'var(--text-muted)'} />
        )}
      </motion.button>

      {/* Connect / Disconnect — center large button */}
      {isIdle ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onConnect}
          className="btn-primary"
          style={{
            padding: '14px 40px',
            height: '52px',
            width: 'auto',
            fontSize: '1rem',
            borderRadius: '26px',
          }}
        >
          Connect to Agent
        </motion.button>
      ) : isConnecting ? (
        <button
          disabled
          className="btn-primary"
          style={{
            padding: '14px 40px',
            height: '52px',
            width: 'auto',
            fontSize: '1rem',
            borderRadius: '26px',
            opacity: 0.75,
            cursor: 'wait',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
          Connecting…
        </button>
      ) : (
        /* Disconnect — large danger circle */
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onDisconnect}
          title="End session"
          className="btn-icon-circle"
          style={{
            width: '64px',
            height: '64px',
            background: 'rgba(239,68,68,0.18)',
            borderColor: 'rgba(239,68,68,0.35)',
          }}
        >
          <Square size={24} color="var(--status-error)" />
        </motion.button>
      )}

      {/* Volume toggle */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onToggleVolume}
        disabled={controlsDisabled}
        title={isVolumeOff ? 'Unmute speaker' : 'Mute speaker'}
        className="btn-icon-circle"
        style={{
          width: '52px',
          height: '52px',
          opacity: controlsDisabled ? 0.38 : 1,
          cursor: controlsDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isVolumeOff ? (
          <VolumeX size={20} color={controlsDisabled ? '#4a5568' : '#ef4444'} />
        ) : (
          <Volume2 size={20} color={controlsDisabled ? '#4a5568' : 'var(--text-muted)'} />
        )}
      </motion.button>
    </div>
  );
}
