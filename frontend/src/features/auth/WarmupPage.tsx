/**
 * WarmupPage.tsx
 * ──────────────
 * Shown at /warming-up immediately after login while the backend warms up.
 * Polls GET /auth/warmup-status every 600ms and auto-redirects to /dashboard
 * once done (or after a 10-second safety timeout).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';

// ── Interesting facts ─────────────────────────────────────────────────────────
const FACTS = [
  {
    emoji: '🧠',
    fact: 'The human brain processes speech at ~150 words/min, but can comprehend audio played at up to 300 words/min with no loss in understanding.',
  },
  {
    emoji: '⚡',
    fact: 'Whisper, the ASR model powering this agent, was trained on 680,000 hours of multilingual audio — more than 77 years of speech.',
  },
  {
    emoji: '🔗',
    fact: 'LangGraph lets the AI plan multi-step tool calls as a directed graph — so it can search the web, run a calculation, and synthesize results all in one response.',
  },
  {
    emoji: '🎙️',
    fact: "The first voice-activated computer was IBM's \"Shoebox\" from 1961 — it could recognise 16 spoken words and the digits 0 through 9.",
  },
  {
    emoji: '🌊',
    fact: "Cartesia's Sonic TTS model generates speech waveforms end-to-end, skipping the intermediate spectrogram stage that older models required.",
  },
  {
    emoji: '🚀',
    fact: 'Groq\'s LPU (Language Processing Unit) is purpose-built for inference — delivering deterministic, ultra-low-latency outputs vs. GPU-based approaches.',
  },
  {
    emoji: '🔐',
    fact: 'Barge-in detection — interrupting the AI mid-sentence — requires sub-50ms VAD (Voice Activity Detection) to feel natural.',
  },
  {
    emoji: '📡',
    fact: 'WebRTC, the protocol LiveKit is built on, was originally designed for browser-to-browser video calls but now powers real-time audio pipelines at scale.',
  },
];

// ── Warmup steps UI config ────────────────────────────────────────────────────
const STEPS = [
  {
    key: 'langgraph',
    icon: '🧩',
    label: 'Compiling LangGraph agent graph',
    color: '#6366f1',
    doneKeys: ['langgraph', 'groq', 'cerebras', 'done'],
  },
  {
    key: 'groq',
    icon: '🎤',
    label: 'Opening Groq STT connection',
    color: '#3b82f6',
    doneKeys: ['groq', 'cerebras', 'done'],
  },
  {
    key: 'cerebras',
    icon: '🤖',
    label: 'Opening Cerebras LLM connection',
    color: '#a855f7',
    doneKeys: ['cerebras', 'done'],
  },
] as const;

// Percentage estimate per step (cumulative)
const STEP_PROGRESS: Record<string, number> = {
  idle: 0,
  starting: 5,
  langgraph: 35,
  groq: 65,
  cerebras: 90,
  done: 100,
};

// ── Bar bounce keyframes (inline) ─────────────────────────────────────────────
const BAR_HEIGHTS = [18, 28, 22, 32, 20, 26, 16];
const BAR_DELAYS = [0, 0.1, 0.2, 0.1, 0.15, 0.05, 0.2];

// ── Component ─────────────────────────────────────────────────────────────────
export function WarmupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const forceNewSession: boolean =
    (location.state as { forceNewSession?: boolean })?.forceNewSession ?? false;

  const [factIndex, setFactIndex] = useState(0);
  const [showFact, setShowFact] = useState(true);
  const [warmupStep, setWarmupStep] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [exitAnim, setExitAnim] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const factTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Redirect to dashboard ─────────────────────────────────────────────────
  const goToDashboard = useCallback(() => {
    setExitAnim(true);
    setTimeout(() => {
      navigate('/dashboard', { state: { forceNewSession } });
    }, 700);
  }, [navigate, forceNewSession]);

  // ── Poll backend ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function poll() {
      try {
        const { data } = await api.get<{ done: boolean; step: string; elapsed: number }>(
          '/auth/warmup-status',
        );
        setWarmupStep(data.step);
        setProgress(STEP_PROGRESS[data.step] ?? 0);
        if (data.done) {
          setAllDone(true);
          cleanup();
          // Small pause so user sees the 100% state before redirect
          setTimeout(goToDashboard, 900);
        }
      } catch {
        // Network error — keep polling; timeout will catch any real issue
      }
    }

    function cleanup() {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (factTimerRef.current) clearInterval(factTimerRef.current);
    }

    poll(); // immediate first call
    pollRef.current = setInterval(poll, 600);

    // Safety hard-timeout: 10s max
    timeoutRef.current = setTimeout(() => {
      cleanup();
      goToDashboard();
    }, 10_000);

    return cleanup;
  }, [goToDashboard]);

  // ── Cycle facts ───────────────────────────────────────────────────────────
  useEffect(() => {
    factTimerRef.current = setInterval(() => {
      setShowFact(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % FACTS.length);
        setShowFact(true);
      }, 400);
    }, 3000);
    return () => {
      if (factTimerRef.current) clearInterval(factTimerRef.current);
    };
  }, []);

  const currentFact = FACTS[factIndex];

  // ── Step status helpers ───────────────────────────────────────────────────
  function getStepState(step: (typeof STEPS)[number]): 'done' | 'active' | 'waiting' {
    if (step.doneKeys.includes(warmupStep as never)) {
      // if current step is past this one, it's done
      const stepIdx = STEPS.findIndex((s) => s.key === step.key);
      const currentIdx = STEPS.findIndex((s) => s.key === warmupStep);
      if (warmupStep === 'done' || currentIdx > stepIdx) return 'done';
    }
    if (warmupStep === step.key) return 'active';
    if (allDone) return 'done';
    return 'waiting';
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exitAnim ? 0 : 1 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080b12',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Nebula orbs ── */}
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(99,102,241,0.20)',
          '--nebula-dur': '10s',
          '--nebula-delay': '0s',
          width: '700px',
          height: '700px',
          top: '-150px',
          left: '-150px',
        } as React.CSSProperties}
      />
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(168,85,247,0.14)',
          '--nebula-dur': '13s',
          '--nebula-delay': '2s',
          width: '500px',
          height: '500px',
          bottom: '-80px',
          right: '-80px',
        } as React.CSSProperties}
      />
      <div
        className="nebula"
        style={{
          '--nebula-color': 'rgba(59,130,246,0.10)',
          '--nebula-dur': '8s',
          '--nebula-delay': '1s',
          width: '400px',
          height: '400px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        } as React.CSSProperties}
      />

      {/* ── Content card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0, 0, 0.2, 1] }}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 540,
          margin: '0 16px',
          borderRadius: 24,
          background: 'rgba(13,16,24,0.82)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(99,102,241,0.18)',
          boxShadow:
            '0 0 80px rgba(99,102,241,0.12), 0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          padding: '48px 44px 40px',
        }}
      >
        {/* ── Animated orb ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            {/* Ambient glow */}
            <div
              style={{
                position: 'absolute',
                inset: -30,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            {/* Outer ring */}
            <div
              style={{
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: '50%',
                animation: 'orb-spin 10s linear infinite',
                background:
                  'conic-gradient(from 0deg, rgba(59,130,246,0.7) 0deg, transparent 60deg, transparent 300deg, rgba(59,130,246,0.7) 360deg)',
                WebkitMask: 'radial-gradient(circle, transparent 56px, black 57px)',
                mask: 'radial-gradient(circle, transparent 56px, black 57px)',
              }}
            />
            {/* Mid ring */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                width: 100,
                height: 100,
                borderRadius: '50%',
                animation: 'orb-spin-ccw 7s linear infinite',
                background:
                  'conic-gradient(from 180deg, rgba(168,85,247,0.6) 0deg, transparent 70deg, transparent 290deg, rgba(168,85,247,0.6) 360deg)',
                WebkitMask: 'radial-gradient(circle, transparent 45px, black 46px)',
                mask: 'radial-gradient(circle, transparent 45px, black 46px)',
              }}
            />
            {/* Inner pulse ring */}
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                width: 84,
                height: 84,
                borderRadius: '50%',
                border: '1px solid rgba(99,102,241,0.35)',
                animation: 'orb-pulse 3s ease-in-out infinite',
              }}
            />
            {/* Core */}
            <div
              style={{
                position: 'absolute',
                top: 26,
                left: 26,
                width: 68,
                height: 68,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 35% 35%, rgba(99,102,241,0.85) 0%, rgba(59,130,246,0.55) 40%, rgba(8,11,18,0.9) 100%)',
                boxShadow: '0 0 32px rgba(99,102,241,0.5)',
                animation: 'orb-breathe 2.5s ease-in-out infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {/* Audio bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                {BAR_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 2.5,
                      height: h * 0.55,
                      borderRadius: 2,
                      background: 'linear-gradient(to top, #3b82f6, #a855f7)',
                      transformOrigin: 'bottom',
                      animation: `bar-bounce 0.75s ease-in-out ${BAR_DELAYS[i]}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#f0f4ff',
            }}
          >
            Warming up your AI&hellip;
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#64748b',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Priming ASR · LLM · TTS for instant response
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div
          style={{
            height: 6,
            borderRadius: 100,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(99,102,241,0.14)',
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <motion.div
            animate={{ width: `${allDone ? 100 : progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 100,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1, #a855f7)',
              boxShadow: '0 0 12px rgba(99,102,241,0.6)',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.68rem',
              color: '#4a5568',
            }}
          >
            {allDone ? '100' : progress}%
          </span>
        </div>

        {/* ── Step tracker ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {STEPS.map((step) => {
            const state = getStepState(step);
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background:
                    state === 'active'
                      ? `${step.color}14`
                      : state === 'done'
                        ? 'rgba(16,185,129,0.06)'
                        : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${
                    state === 'active'
                      ? `${step.color}40`
                      : state === 'done'
                        ? 'rgba(16,185,129,0.2)'
                        : 'rgba(255,255,255,0.05)'
                  }`,
                  transition: 'background 0.4s, border-color 0.4s',
                }}
              >
                {/* Status icon */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    background:
                      state === 'active'
                        ? `${step.color}22`
                        : state === 'done'
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${
                      state === 'active'
                        ? `${step.color}44`
                        : state === 'done'
                          ? 'rgba(16,185,129,0.3)'
                          : 'rgba(255,255,255,0.08)'
                    }`,
                  }}
                >
                  {state === 'done' ? '✅' : state === 'active' ? '⚙️' : '○'}
                </div>

                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.82rem',
                    fontWeight: state === 'active' ? 600 : 400,
                    color:
                      state === 'active'
                        ? step.color
                        : state === 'done'
                          ? '#10b981'
                          : '#4a5568',
                    transition: 'color 0.3s',
                  }}
                >
                  {step.label}
                </span>

                {/* Active spinner */}
                {state === 'active' && (
                  <div
                    style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'flex-end' }}
                  >
                    {[10, 16, 12].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: 2,
                          height: h,
                          borderRadius: 2,
                          background: step.color,
                          animation: `bar-bounce 0.6s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* ── Fact card ── */}
        <div
          style={{
            borderRadius: 14,
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.16)',
            padding: '16px 18px',
            minHeight: 88,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6366f1',
            }}
          >
            💡 Did You Know?
          </p>
          <AnimatePresence mode="wait">
            {showFact && (
              <motion.p
                key={factIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                }}
              >
                <span style={{ marginRight: 6 }}>{currentFact.emoji}</span>
                {currentFact.fact}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── All done celebration ── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 20,
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#10b981',
              }}
            >
              🚀 All systems ready — redirecting you now!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
