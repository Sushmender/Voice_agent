import React from 'react';
import type { AgentState, SpeakingState } from '../../../types/agent';

// ── Audio bars sub-component ──────────────────────────────────────────────────
interface AudioBarsProps {
  mode: 'idle' | 'listening' | 'speaking' | 'warming';
  bars: number[]; // 0-1 amplitude per bar
}

function AudioBars({ mode, bars }: AudioBarsProps) {
  const barCount = 7;
  const maxH = [28, 40, 48, 36, 44, 32, 38]; // max heights per DESIGN_REFERENCE

  const barStyle = (i: number, amp: number): React.CSSProperties => {
    const baseH = mode === 'idle' || mode === 'warming' ? 6 : maxH[i] * Math.max(0.18, amp);
    return {
      width: '3px',
      height: `${baseH}px`,
      borderRadius: '2px',
      transformOrigin: 'bottom',
      transition: 'height 0.1s ease',
      animationDelay: mode === 'listening'
        ? `${i * 0.08}s`
        : mode === 'speaking'
        ? `${i * 0.12}s`
        : `${i * 0.2}s`,
    };
  };

  const barClass = (mode: string) => {
    switch (mode) {
      case 'listening': return 'viz-bar-listening';
      case 'speaking':  return 'viz-bar-speaking';
      case 'warming':   return 'viz-bar-warming';
      default:          return 'viz-bar-idle';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '48px' }}>
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className={barClass(mode)}
          style={barStyle(i, bars[i] ?? 0)}
        />
      ))}
    </div>
  );
}

// ── Main orb ──────────────────────────────────────────────────────────────────
interface OrbVisualizerProps {
  agentState: AgentState;
  speakingState: SpeakingState;
  bars?: number[]; // 0-1 per bar from useWaveform
  amplitude?: number;
}

export function OrbVisualizer({
  agentState,
  speakingState,
  bars = Array(7).fill(0),
}: OrbVisualizerProps) {
  // Derive combined mode for styling
  const isError      = agentState === 'ERROR';
  const isConnecting = agentState === 'CONNECTING';
  const isWarming    = agentState === 'WARMING_UP';
  const isConnected  = agentState === 'CONNECTED';
  const isListening  = isConnected && speakingState === 'LISTENING';
  const isSpeaking   = isConnected && speakingState === 'SPEAKING';
  const isIdle       = agentState === 'IDLE';

  // Bar mode
  const barMode: AudioBarsProps['mode'] = isWarming
    ? 'warming'
    : isListening
    ? 'listening'
    : isSpeaking
    ? 'speaking'
    : 'idle';

  // Outer ring spin speed
  const ringAnimate = isIdle ? 'none' : 'orb-spin 18s linear infinite';
  const midAnimate  = isIdle ? 'none' : 'orb-spin-ccw 12s linear infinite';
  const innerAnimate = isIdle ? 'none' : 'orb-pulse 3s ease-in-out infinite';
  const coreAnimate  = 'orb-breathe 2.5s ease-in-out infinite';

  // Core gradient based on state
  const coreGradient = isError
    ? 'radial-gradient(circle at 38% 35%, rgba(239,68,68,0.18) 0%, rgba(6,9,18,0.95) 100%)'
    : isWarming
    ? 'radial-gradient(circle at 38% 35%, rgba(245,158,11,0.22) 0%, rgba(99,102,241,0.18) 40%, rgba(59,130,246,0.12) 70%, rgba(6,9,18,0.80) 100%)'
    : isListening
    ? 'radial-gradient(circle at 38% 35%, rgba(59,130,246,0.38) 0%, rgba(59,130,246,0.20) 40%, rgba(6,9,18,0.80) 100%)'
    : isSpeaking
    ? 'radial-gradient(circle at 38% 35%, rgba(99,102,241,0.42) 0%, rgba(168,85,247,0.22) 40%, rgba(6,9,18,0.80) 100%)'
    : isIdle
    ? 'radial-gradient(circle, rgba(30,42,58,0.85) 0%, rgba(8,11,18,0.95) 100%)'
    : 'radial-gradient(circle at 38% 35%, rgba(147,168,255,0.30) 0%, rgba(99,102,241,0.22) 30%, rgba(59,130,246,0.15) 60%, rgba(6,9,18,0.80) 100%)';

  // Core glow
  const coreGlow = isError
    ? '0 0 40px rgba(239,68,68,0.25)'
    : isWarming
    ? '0 0 60px rgba(245,158,11,0.28), 0 0 100px rgba(99,102,241,0.18)'
    : isListening
    ? '0 0 60px rgba(59,130,246,0.45), 0 0 120px rgba(59,130,246,0.18)'
    : isSpeaking
    ? '0 0 80px rgba(99,102,241,0.55), 0 0 160px rgba(59,130,246,0.22)'
    : isIdle
    ? 'none'
    : '0 0 60px rgba(99,102,241,0.38)';

  // Outer ring opacity
  const ringOpacity = isIdle ? 0.25 : 1;
  const midOpacity  = isIdle ? 0.20 : 1;
  const innerOpacity = isIdle ? 0.15 : 1;

  // Mic icon color
  const micColor = isError
    ? 'rgba(239,68,68,0.55)'
    : isWarming
    ? 'rgba(245,158,11,0.65)'
    : isListening
    ? '#60a5fa'
    : isSpeaking
    ? 'rgba(168,180,255,0.65)'
    : isIdle
    ? '#4a5568'
    : 'rgba(160,180,255,0.75)';

  // Error shake
  const coreExtraStyle: React.CSSProperties = isError
    ? { animation: `${coreAnimate}, orb-error-shake 0.5s ease-in-out` }
    : {};

  // Connecting sweep overlay
  const showSweep = isConnecting;

  // Ripple rings for SPEAKING state
  const showRipples = isSpeaking;

  // Scale outer ring for LISTENING (subtle pulse)
  const outerRingExtra: React.CSSProperties = isListening
    ? { animation: `${ringAnimate}, orb-outer-listen 0.4s ease-in-out infinite alternate` }
    : {};

  // Ambient halo intensity
  const haloOpacity = isSpeaking ? 0.35 : isConnected ? 0.22 : 0.12;

  return (
    <div
      className="orb-root"
      style={{
        position: 'relative',
        width: '260px',
        height: '260px',
        flexShrink: 0,
      }}
    >
      {/* Div 1 — Ambient halo */}
      <div
        style={{
          position: 'absolute',
          inset: '-40px',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(99,102,241,${haloOpacity}) 0%, transparent 68%)`,
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Div 2 — Outer ring (260px) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          backgroundImage:
            'linear-gradient(#080b12, #080b12), linear-gradient(135deg, rgba(59,130,246,0.65), rgba(168,85,247,0.15), rgba(59,130,246,0.65))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '1px solid transparent',
          animation: ringAnimate,
          opacity: ringOpacity,
          transition: 'opacity 0.5s ease',
          ...outerRingExtra,
        }}
      >
        {/* Tracking dot */}
        <div style={{
          position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)',
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#3b82f6', boxShadow: '0 0 12px #3b82f6',
        }} />
      </div>

      {/* Connecting sweep overlay */}
      {showSweep && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(99,102,241,0.55) 0deg, transparent 120deg)',
          animation: 'orb-spin 1.2s linear infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Div 3 — Mid ring (inset 22px) */}
      <div
        style={{
          position: 'absolute',
          inset: '22px',
          borderRadius: '50%',
          backgroundImage:
            'linear-gradient(#080b12, #080b12), linear-gradient(135deg, rgba(168,85,247,0.55), rgba(99,102,241,0.15), rgba(168,85,247,0.55))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '1px solid transparent',
          animation: midAnimate,
          opacity: midOpacity,
          transition: 'opacity 0.5s ease',
        }}
      >
        <div style={{
          position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#a855f7', boxShadow: '0 0 8px #a855f7',
        }} />
      </div>

      {/* Div 4 — Inner pulse ring (inset 44px) */}
      <div
        style={{
          position: 'absolute',
          inset: '44px',
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.35)',
          boxShadow: '0 0 24px rgba(99,102,241,0.14) inset',
          animation: innerAnimate,
          opacity: innerOpacity,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Ripple rings — SPEAKING only */}
      {showRipples && (
        <>
          <div style={{
            position: 'absolute', inset: '44px', borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.5)',
            animation: 'orb-speak-ripple 1.5s ease-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: '44px', borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.5)',
            animation: 'orb-speak-ripple 1.5s ease-out 0.65s infinite',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Div 5 — Core (inset 58px) */}
      <div
        style={{
          position: 'absolute',
          inset: '58px',
          borderRadius: '50%',
          background: coreGradient,
          backdropFilter: 'blur(8px)',
          boxShadow: coreGlow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          animation: coreAnimate,
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
          ...coreExtraStyle,
        }}
      >
        {/* Audio bars */}
        <AudioBars mode={barMode} bars={bars} />

        {/* Mic icon */}
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill={micColor}
          style={{ transition: 'fill 0.4s ease', flexShrink: 0 }}
        >
          <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 16.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
        </svg>
      </div>

      {/* Error indicator — subtle red dot */}
      {isError && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#ef4444', boxShadow: '0 0 8px #ef4444',
        }} />
      )}
    </div>
  );
}
