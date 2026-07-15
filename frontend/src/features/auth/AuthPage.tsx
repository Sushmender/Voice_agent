import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { useLoginMutation, useSignupMutation } from './hooks/useAuth';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup';

// ─── Pipeline node cycling ────────────────────────────────────────────────────
const PIPELINE_NODES = [
  { id: 'asr', label: 'ASR', sub: 'Groq Whisper', color: '#3b82f6' },
  { id: 'llm', label: 'LLM', sub: 'LangGraph',    color: '#6366f1' },
  { id: 'tts', label: 'TTS', sub: 'Cartesia',     color: '#a855f7' },
];

// Audio bar heights per spec
const BAR_HEIGHTS = [28, 40, 48, 36, 44, 32, 38];
const BAR_DELAYS  = [0, 0.1, 0.2, 0.1, 0.15, 0.05, 0.2];

// Feature pills
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
        <path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/>
      </svg>
    ),
    label: 'Real-time voice interaction',
    sub: 'Sub-100ms round-trip',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46L4.5 9"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46L19.5 9"/>
      </svg>
    ),
    label: 'LangGraph-powered reasoning',
    sub: 'Multi-step tool execution',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <polyline points="13 2 13 9 20 9"/><polygon points="2 2 2 22 22 22 22 2"/>
      </svg>
    ),
    label: 'Barge-in interruption',
    sub: 'Natural conversation flow',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    label: 'MCP tool integrations',
    sub: 'Extensible action registry',
  },
];

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [activeNode, setActiveNode] = useState(0);
  const loginMutation  = useLoginMutation();
  const signupMutation = useSignupMutation();

  // Cycle pipeline node every 1400 ms
  useEffect(() => {
    const id = setInterval(() => setActiveNode(n => (n + 1) % 3), 1400);
    return () => clearInterval(id);
  }, []);

  const handleLoginSuccess = () => {
    toast.success('Welcome back! 👋');
    navigate('/console');
  };

  const handleSignupSuccess = async (email: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/console');
    } catch {
      toast.error('Account created! Please sign in.');
      setMode('login');
    }
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Nebula background ── */}
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(59,130,246,0.18)',
          '--nebula-dur': '9s',
          '--nebula-delay': '0s',
          width: '600px', height: '600px',
          top: '-100px', left: '-100px',
        } as React.CSSProperties}
      />
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(168,85,247,0.14)',
          '--nebula-dur': '12s',
          '--nebula-delay': '3s',
          width: '500px', height: '500px',
          bottom: '-80px', right: '-80px',
        } as React.CSSProperties}
      />
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(99,102,241,0.10)',
          '--nebula-dur': '7s',
          '--nebula-delay': '1.5s',
          width: '400px', height: '400px',
          top: '40%', left: '40%',
          transform: 'translate(-50%,-50%)',
        } as React.CSSProperties}
      />

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL — Branding
      ════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex w-[55%] relative flex-col items-center justify-center gap-10 px-16 py-12"
        style={{ zIndex: 'var(--z-content)' }}
      >
        {/* Tech stack badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(99,102,241,0.10)',
            border: '1px solid rgba(99,102,241,0.22)',
            padding: '6px 16px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {/* Live dot */}
          <span
            style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              display: 'inline-block',
              animation: 'status-pulse 2s ease-in-out infinite',
            }}
          />
          LiveKit · Pipecat · LangGraph · MCP
        </motion.div>

        {/* ── 5-Layer Orb ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative flex items-center justify-center"
          style={{ width: 280, height: 280 }}
        >
          {/* Layer 1: Ambient glow */}
          <div style={{
            position: 'absolute',
            inset: -40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Layer 2: Outer ring 280px — spins CW 18s */}
          <div style={{
            position: 'absolute',
            width: 280, height: 280,
            borderRadius: '50%',
            animation: 'orb-spin 18s linear infinite',
            background: 'conic-gradient(from 0deg, rgba(59,130,246,0.6) 0deg, transparent 60deg, transparent 300deg, rgba(59,130,246,0.6) 360deg)',
            WebkitMask: 'radial-gradient(circle, transparent 135px, black 136px)',
            mask: 'radial-gradient(circle, transparent 135px, black 136px)',
          }}>
            {/* Blue orbiting dot at top */}
            <div style={{
              position: 'absolute',
              top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#3b82f6',
              boxShadow: '0 0 12px #3b82f6',
              marginTop: 2,
            }} />
          </div>

          {/* Layer 3: Mid ring 236px — spins CCW 12s */}
          <div style={{
            position: 'absolute',
            width: 236, height: 236,
            borderRadius: '50%',
            animation: 'orb-spin-ccw 12s linear infinite',
            background: 'conic-gradient(from 180deg, rgba(168,85,247,0.5) 0deg, transparent 70deg, transparent 290deg, rgba(168,85,247,0.5) 360deg)',
            WebkitMask: 'radial-gradient(circle, transparent 113px, black 114px)',
            mask: 'radial-gradient(circle, transparent 113px, black 114px)',
          }}>
            {/* Violet dot at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#a855f7',
              boxShadow: '0 0 10px #a855f7',
              marginBottom: 2,
            }} />
          </div>

          {/* Layer 4: Inner pulse ring 192px */}
          <div style={{
            position: 'absolute',
            width: 192, height: 192,
            borderRadius: '50%',
            border: '1px solid rgba(99,102,241,0.35)',
            animation: 'orb-pulse 3s ease-in-out infinite',
          }} />

          {/* Layer 5: Core 164px */}
          <div style={{
            position: 'relative',
            width: 164, height: 164,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(99,102,241,0.8) 0%, rgba(59,130,246,0.5) 40%, rgba(8,11,18,0.9) 100%)',
            boxShadow: 'var(--shadow-glow-indigo)',
            animation: 'orb-breathe 2.5s ease-in-out infinite',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            {/* 7 audio bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: 'linear-gradient(to top, #3b82f6, #a855f7)',
                    transformOrigin: 'bottom',
                    animation: `bar-bounce 0.75s ease-in-out ${BAR_DELAYS[i]}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Mic icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={2}
              style={{ width: 18, height: 18 }}
            >
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/>
            </svg>
          </div>
        </motion.div>

        {/* Shimmer heading + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1
            className="shimmer-heading font-bold mb-2"
            style={{ fontSize: '2.4rem', letterSpacing: '-0.04em' }}
          >
            Voice AI Agent
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 4 }}>
            Speak naturally. Get instant answers.
          </p>
          <p style={{ color: 'var(--text-ghost)', fontSize: '0.78rem', fontFamily: '"JetBrains Mono", monospace' }}>
            Enterprise-grade ASR → LLM → TTS pipeline.
          </p>
        </motion.div>

        {/* ── Pipeline viz ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {PIPELINE_NODES.map((node, i) => {
            const isActive = activeNode === i;
            return (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                      ? `rgba(${node.id === 'asr' ? '59,130,246' : node.id === 'llm' ? '99,102,241' : '168,85,247'}, 0.15)`
                      : 'var(--bg-surface)',
                    border: `1px solid ${isActive ? node.color : 'rgba(99,102,241,0.12)'}`,
                    boxShadow: isActive ? `0 0 16px ${node.color}55` : 'none',
                    transition: 'all 0.3s',
                    textAlign: 'center',
                    minWidth: 72,
                  }}
                >
                  {/* Mini bars when active */}
                  {isActive && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, height: 14, marginBottom: 4 }}>
                      {[8, 12, 10, 14, 9].map((bh, bi) => (
                        <div key={bi} style={{
                          width: 2, height: bh,
                          borderRadius: 1,
                          background: node.color,
                          transformOrigin: 'bottom',
                          animation: `bar-bounce 0.6s ease-in-out ${bi * 0.1}s infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isActive ? node.color : 'var(--text-ghost)',
                    transition: 'color 0.3s',
                  }}>
                    {node.label}
                  </div>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.6rem',
                    color: isActive ? node.color + 'cc' : 'var(--text-ghost)',
                    marginTop: 2,
                    transition: 'color 0.3s',
                  }}>
                    {node.sub}
                  </div>
                </div>

                {/* SVG dashed arrow between nodes */}
                {i < 2 && (
                  <svg width="28" height="16" viewBox="0 0 28 16">
                    <line
                      x1="0" y1="8" x2="20" y2="8"
                      stroke="rgba(99,102,241,0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <polyline
                      points="16,4 22,8 16,12"
                      fill="none"
                      stroke="rgba(99,102,241,0.4)"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ── Feature pills ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.12)',
                padding: '10px 14px',
                cursor: 'default',
                transition: 'border-color 150ms, background 150ms',
              }}
              whileHover={{
                borderColor: 'rgba(99,102,241,0.28)',
                backgroundColor: 'rgba(99,102,241,0.10)',
              }}
            >
              {/* Icon box */}
              <div style={{
                width: 34, height: 34,
                borderRadius: 8,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a5b4fc',
                flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>
                  {f.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — Glass card form
      ════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ zIndex: 'var(--z-content)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card w-full"
          style={{ maxWidth: 440, padding: '44px 40px' }}
        >
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-indigo)',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} style={{ width: 18, height: 18 }}>
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/>
              </svg>
            </div>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              VoiceAgent
            </span>
          </div>

          {/* Mode toggle pill */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 'var(--radius-pill)',
            padding: 3,
            marginBottom: 28,
          }}>
            {(['signup', 'login'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  ...(mode === m
                    ? {
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))',
                        boxShadow: '0 0 0 1px rgba(99,102,241,0.35)',
                        color: '#a5b4fc',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--text-ghost)',
                      }),
                }}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: 6,
            }}>
              {mode === 'signup' ? 'Start talking to your' : 'Welcome back to your'}
            </h2>
            <h2 style={{
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              background: 'var(--accent-gradient-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 0,
            }}>
              {mode === 'signup' ? 'AI voice assistant' : 'AI voice assistant'}
            </h2>
          </div>

          {/* Forms with AnimatePresence */}
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onSwitchToSignup={() => setMode('signup')}
                  loginMutation={loginMutation}
                />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SignupForm
                  onSuccess={handleSignupSuccess}
                  onSwitchToLogin={() => setMode('login')}
                  signupMutation={signupMutation}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Version label */}
          <p style={{
            marginTop: 24,
            textAlign: 'center',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.62rem',
            color: 'var(--text-ghost)',
            letterSpacing: '0.04em',
          }}>
            v2.4.1 · ASR→LLM→TTS · Barge-in ready
          </p>
        </motion.div>
      </div>
    </div>
  );
}
