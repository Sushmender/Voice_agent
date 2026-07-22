import React, { useEffect, useRef, useState } from 'react';
import type { AgentState, SpeakingState } from '../../../types/agent';

// ── Idle colour cycle palette ─────────────────────────────────────────────────
// Each step: [core gradient, core glow, ring gradient, rgb components for halo]
const IDLE_PALETTE = [
  {
    gradient: 'radial-gradient(circle at 38% 35%, rgba(20,184,166,0.38) 0%, rgba(6,182,212,0.20) 40%, rgba(6,9,18,0.82) 100%)',
    glow:     '0 0 55px rgba(20,184,166,0.34), 0 0 100px rgba(6,182,212,0.15)',
    outerRing:'linear-gradient(135deg, rgba(20,184,166,0.75), rgba(6,182,212,0.22), rgba(20,184,166,0.75))',
    midRing:  'linear-gradient(135deg, rgba(6,182,212,0.60), rgba(20,184,166,0.15), rgba(6,182,212,0.60))',
    dot1:     '#5eead4', dot1Glow: '#5eead4',
    dot2:     '#22d3ee', dot2Glow: '#22d3ee',
    haloRGB:  '20,184,166',
    mic:      '#5eead4',
    inner:    '20,184,166',
  },
  {
    gradient: 'radial-gradient(circle at 38% 35%, rgba(6,182,212,0.40) 0%, rgba(59,130,246,0.22) 40%, rgba(6,9,18,0.82) 100%)',
    glow:     '0 0 55px rgba(6,182,212,0.36), 0 0 100px rgba(59,130,246,0.15)',
    outerRing:'linear-gradient(135deg, rgba(6,182,212,0.75), rgba(59,130,246,0.22), rgba(6,182,212,0.75))',
    midRing:  'linear-gradient(135deg, rgba(59,130,246,0.60), rgba(6,182,212,0.15), rgba(59,130,246,0.60))',
    dot1:     '#22d3ee', dot1Glow: '#22d3ee',
    dot2:     '#60a5fa', dot2Glow: '#60a5fa',
    haloRGB:  '6,182,212',
    mic:      '#22d3ee',
    inner:    '6,182,212',
  },
  {
    gradient: 'radial-gradient(circle at 38% 35%, rgba(59,130,246,0.36) 0%, rgba(99,102,241,0.20) 40%, rgba(6,9,18,0.82) 100%)',
    glow:     '0 0 55px rgba(59,130,246,0.32), 0 0 100px rgba(99,102,241,0.14)',
    outerRing:'linear-gradient(135deg, rgba(59,130,246,0.75), rgba(99,102,241,0.22), rgba(59,130,246,0.75))',
    midRing:  'linear-gradient(135deg, rgba(99,102,241,0.60), rgba(59,130,246,0.15), rgba(99,102,241,0.60))',
    dot1:     '#60a5fa', dot1Glow: '#60a5fa',
    dot2:     '#818cf8', dot2Glow: '#818cf8',
    haloRGB:  '59,130,246',
    mic:      '#60a5fa',
    inner:    '59,130,246',
  },
  {
    gradient: 'radial-gradient(circle at 38% 35%, rgba(99,102,241,0.38) 0%, rgba(168,85,247,0.20) 40%, rgba(6,9,18,0.82) 100%)',
    glow:     '0 0 55px rgba(99,102,241,0.34), 0 0 100px rgba(168,85,247,0.14)',
    outerRing:'linear-gradient(135deg, rgba(99,102,241,0.75), rgba(168,85,247,0.22), rgba(99,102,241,0.75))',
    midRing:  'linear-gradient(135deg, rgba(168,85,247,0.60), rgba(99,102,241,0.15), rgba(168,85,247,0.60))',
    dot1:     '#818cf8', dot1Glow: '#818cf8',
    dot2:     '#c084fc', dot2Glow: '#c084fc',
    haloRGB:  '99,102,241',
    mic:      '#818cf8',
    inner:    '99,102,241',
  },
  {
    gradient: 'radial-gradient(circle at 38% 35%, rgba(168,85,247,0.34) 0%, rgba(20,184,166,0.16) 40%, rgba(6,9,18,0.82) 100%)',
    glow:     '0 0 55px rgba(168,85,247,0.30), 0 0 100px rgba(20,184,166,0.12)',
    outerRing:'linear-gradient(135deg, rgba(168,85,247,0.75), rgba(20,184,166,0.22), rgba(168,85,247,0.75))',
    midRing:  'linear-gradient(135deg, rgba(20,184,166,0.60), rgba(168,85,247,0.15), rgba(20,184,166,0.60))',
    dot1:     '#c084fc', dot1Glow: '#c084fc',
    dot2:     '#5eead4', dot2Glow: '#5eead4',
    haloRGB:  '168,85,247',
    mic:      '#c084fc',
    inner:    '168,85,247',
  },
];

// ── Main orb ──────────────────────────────────────────────────────────────────
interface OrbVisualizerProps {
  agentState: AgentState;
  speakingState: SpeakingState;
  bars?: number[];
  amplitude?: number;
}

export function OrbVisualizer({
  agentState,
  speakingState,
  amplitude = 0,
}: OrbVisualizerProps) {
  const isError      = agentState === 'ERROR';
  const isConnecting = agentState === 'CONNECTING';
  const isWarming    = agentState === 'WARMING_UP';
  const isConnected  = agentState === 'CONNECTED';
  const isListening  = isConnected && speakingState === 'LISTENING';
  const isSpeaking   = isConnected && speakingState === 'SPEAKING';
  const isIdle       = agentState === 'IDLE';

  const [idleIdx, setIdleIdx] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isIdle) {
      idleTimerRef.current = setInterval(() => {
        setIdleIdx((i) => (i + 1) % IDLE_PALETTE.length);
      }, 2400);
    } else {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }
    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isIdle]);

  const pal = IDLE_PALETTE[idleIdx];

  const ringAnimate   = isIdle ? 'orb-spin 30s linear infinite'          : 'orb-spin 18s linear infinite';
  const midAnimate    = isIdle ? 'orb-spin-ccw 22s linear infinite'      : 'orb-spin-ccw 12s linear infinite';
  const innerAnimate  = isIdle ? 'orb-pulse 5s ease-in-out infinite'     : 'orb-pulse 3s ease-in-out infinite';
  const coreAnimate   = isIdle ? 'orb-idle-jiggle 3.5s ease-in-out infinite' : 'orb-breathe 2.5s ease-in-out infinite';

  const coreGradient = isError
    ? 'radial-gradient(circle at 38% 35%, rgba(239,68,68,0.18) 0%, rgba(6,9,18,0.95) 100%)'
    : isWarming
    ? 'radial-gradient(circle at 38% 35%, rgba(245,158,11,0.22) 0%, rgba(99,102,241,0.18) 40%, rgba(59,130,246,0.12) 70%, rgba(6,9,18,0.80) 100%)'
    : isListening
    ? 'radial-gradient(circle at 38% 35%, rgba(59,130,246,0.38) 0%, rgba(59,130,246,0.20) 40%, rgba(6,9,18,0.80) 100%)'
    : isSpeaking
    ? 'radial-gradient(circle at 38% 35%, rgba(99,102,241,0.42) 0%, rgba(168,85,247,0.22) 40%, rgba(6,9,18,0.80) 100%)'
    : isIdle
    ? pal.gradient
    : 'radial-gradient(circle at 38% 35%, rgba(147,168,255,0.30) 0%, rgba(99,102,241,0.22) 30%, rgba(59,130,246,0.15) 60%, rgba(6,9,18,0.80) 100%)';

  const coreGlow = isError
    ? '0 0 40px rgba(239,68,68,0.25)'
    : isWarming
    ? '0 0 60px rgba(245,158,11,0.28), 0 0 100px rgba(99,102,241,0.18)'
    : isListening
    ? '0 0 60px rgba(59,130,246,0.45), 0 0 120px rgba(59,130,246,0.18)'
    : isSpeaking
    ? '0 0 80px rgba(99,102,241,0.55), 0 0 160px rgba(59,130,246,0.22)'
    : isIdle
    ? pal.glow
    : '0 0 60px rgba(99,102,241,0.38)';

  const outerRingGradient = isIdle ? pal.outerRing : 'linear-gradient(135deg, rgba(59,130,246,0.65), rgba(168,85,247,0.15), rgba(59,130,246,0.65))';
  const midRingGradient   = isIdle ? pal.midRing   : 'linear-gradient(135deg, rgba(168,85,247,0.55), rgba(99,102,241,0.15), rgba(168,85,247,0.55))';
  const ringOpacity       = isIdle ? 0.80 : 1;
  const midOpacity        = isIdle ? 0.70 : 1;
  const innerOpacity      = isIdle ? 0.55 : 1;

  const micColor = isError ? 'rgba(239,68,68,0.55)' : isWarming ? 'rgba(245,158,11,0.65)'
    : isListening ? '#60a5fa' : isSpeaking ? 'rgba(168,180,255,0.65)' : isIdle ? pal.mic : 'rgba(160,180,255,0.75)';

  const coreExtraStyle: React.CSSProperties = isError ? { animation: `${coreAnimate}, orb-error-shake 0.5s ease-in-out` } : {};
  const outerRingExtra: React.CSSProperties = isListening ? { animation: `${ringAnimate}, orb-outer-listen 0.4s ease-in-out infinite alternate` } : {};
  
  const haloOpacity = isSpeaking ? 0.35 : isConnected ? 0.22 : isIdle ? 0.22 : 0.12;
  const haloRGB = isIdle ? pal.haloRGB : '99,102,241';

  const userSpeakingScale = isListening ? 1 + amplitude * 0.12 : 1;
  const userSpeakingHue = isListening ? amplitude * 240 : 0;
  const userSpeakingRot = isListening ? (amplitude - 0.5) * 15 : 0;

  return (
    <div className="orb-root" style={{ 
        position: 'relative', width: '260px', height: '260px', flexShrink: 0,
        transform: `scale(${userSpeakingScale}) rotate(${userSpeakingRot}deg)`,
        filter: `hue-rotate(${userSpeakingHue}deg)`,
        transition: isListening ? 'transform 0.05s linear, filter 0.05s linear' : 'transform 0.4s ease, filter 0.4s ease',
      }}>

      <div style={{
        position: 'absolute', inset: '-40px', borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${haloRGB},${haloOpacity}) 0%, transparent 68%)`,
        pointerEvents: 'none', transition: 'background 2s ease',
      }} />

      {isIdle && (
        <>
          <div style={{
            position: 'absolute', inset: '30px', borderRadius: '50%',
            border: `1.5px solid rgba(${pal.inner},0.24)`,
            animation: 'orb-idle-ring 4.2s ease-out infinite',
            pointerEvents: 'none', transition: 'border-color 2s ease',
          }} />
          <div style={{
            position: 'absolute', inset: '30px', borderRadius: '50%',
            border: `1.5px solid rgba(${pal.inner},0.13)`,
            animation: 'orb-idle-ring 4.2s ease-out 2.1s infinite',
            pointerEvents: 'none', transition: 'border-color 2s ease',
          }} />
        </>
      )}

      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backgroundImage: `linear-gradient(#080b12, #080b12), ${outerRingGradient}`,
        backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
        border: '1px solid transparent', animation: ringAnimate, opacity: ringOpacity,
        transition: 'opacity 1s ease, background-image 2s ease', ...outerRingExtra,
      }}>
        <div style={{
          position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)',
          width: '6px', height: '6px', borderRadius: '50%',
          background: isIdle ? pal.dot1 : '#3b82f6',
          boxShadow: `0 0 12px ${isIdle ? pal.dot1Glow : '#3b82f6'}`,
          transition: 'background 2s ease, box-shadow 2s ease',
        }} />
      </div>

      {isConnecting && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(99,102,241,0.55) 0deg, transparent 120deg)',
          animation: 'orb-spin 1.2s linear infinite', pointerEvents: 'none',
        }} />
      )}

      <div style={{
        position: 'absolute', inset: '22px', borderRadius: '50%',
        backgroundImage: `linear-gradient(#080b12, #080b12), ${midRingGradient}`,
        backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
        border: '1px solid transparent', animation: midAnimate, opacity: midOpacity,
        transition: 'opacity 1s ease, background-image 2s ease',
      }}>
        <div style={{
          position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
          width: '4px', height: '4px', borderRadius: '50%',
          background: isIdle ? pal.dot2 : '#a855f7',
          boxShadow: `0 0 8px ${isIdle ? pal.dot2Glow : '#a855f7'}`,
          transition: 'background 2s ease, box-shadow 2s ease',
        }} />
      </div>

      <div style={{
        position: 'absolute', inset: '44px', borderRadius: '50%',
        border: `1px solid rgba(${isIdle ? pal.inner : '99,102,241'},0.38)`,
        boxShadow: `0 0 24px rgba(${isIdle ? pal.inner : '99,102,241'},0.16) inset`,
        animation: innerAnimate, opacity: innerOpacity,
        transition: 'opacity 1s ease, border-color 2s ease, box-shadow 2s ease',
      }} />

      {isSpeaking && (
        <>
          <div style={{
            position: 'absolute', inset: '44px', borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.5)',
            animation: 'orb-speak-ripple 1.5s ease-out infinite', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: '44px', borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.5)',
            animation: 'orb-speak-ripple 1.5s ease-out 0.65s infinite', pointerEvents: 'none',
          }} />
        </>
      )}

      <div style={{
        position: 'absolute', inset: '58px', borderRadius: '50%',
        background: coreGradient, backdropFilter: 'blur(8px)', boxShadow: coreGlow,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px', animation: coreAnimate,
        transition: 'background 1.6s ease, box-shadow 1.6s ease', ...coreExtraStyle,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill={micColor}
          style={{ transition: 'fill 1.6s ease', flexShrink: 0 }}>
          <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 16.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
        </svg>
      </div>

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
