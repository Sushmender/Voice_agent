import type { AgentState, PipelineStage } from '../../../types/agent';

interface WaveformStripProps {
  agentState:    AgentState;
  pipelineStage: PipelineStage;
  micBars:       number[]; // 0-1 amplitude, length 32 — user mic
  agentBars:     number[]; // 0-1 amplitude, length 32 — agent audio
}

const BAR_COUNT = 32;

// ── Color palettes per stage ───────────────────────────────────────────────────
const STAGE_CONFIG = {
  ASR_ACTIVE: {
    color:      '#3b82f6',   // blue
    glow:       'rgba(59,130,246,0.55)',
    label:      'Listening',
    useAgent:   false,
  },
  LLM_ACTIVE: {
    color:      '#6366f1',   // indigo
    glow:       'rgba(99,102,241,0.35)',
    label:      'Thinking',
    useAgent:   false,
  },
  TTS_ACTIVE: {
    color:      '#a855f7',   // purple
    glow:       'rgba(168,85,247,0.55)',
    label:      'Speaking',
    useAgent:   true,
  },
  QUIET: {
    color:      'rgba(255,255,255,0.12)',
    glow:       'none',
    label:      null,
    useAgent:   false,
  },
  IDLE: {
    color:      'rgba(255,255,255,0.06)',
    glow:       'none',
    label:      null,
    useAgent:   false,
  },
} as const;

/**
 * WaveformStrip / Graphic Equalizer
 * ----------------------------------
 * 32-bar graphic equalizer that displays:
 *  • ASR_ACTIVE  → blue bars driven by mic amplitude
 *  • LLM_ACTIVE  → slow sinusoidal "thinking" wave (CSS animation, indigo)
 *  • TTS_ACTIVE  → purple bars driven by agent audio amplitude
 *  • QUIET/IDLE  → flat minimal baseline bars
 */
export function WaveformStrip({
  agentState,
  pipelineStage,
  micBars,
  agentBars,
}: WaveformStripProps) {
  const isVisible =
    agentState === 'CONNECTED' ||
    agentState === 'WARMING_UP' ||
    agentState === 'CONNECTING';

  const cfg = STAGE_CONFIG[pipelineStage] ?? STAGE_CONFIG.IDLE;

  // Which bars to use for amplitude-driven stages
  const bars: number[] = (() => {
    if (pipelineStage === 'ASR_ACTIVE') return micBars.slice(0, BAR_COUNT);
    if (pipelineStage === 'TTS_ACTIVE') return agentBars.slice(0, BAR_COUNT);
    return Array(BAR_COUNT).fill(0);
  })();

  const isAmplitudeDriven = pipelineStage === 'ASR_ACTIVE' || pipelineStage === 'TTS_ACTIVE';
  const isLLM             = pipelineStage === 'LLM_ACTIVE';
  const MIN_H = 3;
  const MAX_H = 38;

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '6px',
    }}>
      {/* ── Equalizer bars ── */}
      <div
        role="img"
        aria-label={cfg.label ? `${cfg.label} audio visualizer` : 'Audio visualizer'}
        style={{
          display:     'flex',
          alignItems:  'flex-end',
          gap:         '2.5px',
          width:       '220px',
          height:      '42px',
          padding:     '0 2px',
        }}
      >
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const amp  = bars[i] ?? 0;
          const h    = isAmplitudeDriven
            ? Math.max(MIN_H, amp * MAX_H)
            : MIN_H + Math.sin((i / BAR_COUNT) * Math.PI) * 3;   // gentle idle curve

          // Per-bar gradient opacity based on amplitude for realism
          const opacity = isAmplitudeDriven ? 0.5 + amp * 0.5 : 1;

          return (
            <div
              key={i}
              style={{
                flex:              1,
                height:            `${h}px`,
                borderRadius:      '2px 2px 1px 1px',
                background:        isLLM
                  ? cfg.color     // flat color for LLM, CSS animation handles movement
                  : `linear-gradient(to top, ${cfg.color}aa, ${cfg.color})`,
                opacity,
                transformOrigin:  'bottom',
                transition:       isAmplitudeDriven
                  ? 'height 0.07s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.12s ease'
                  : 'height 0.4s ease, background 0.6s ease, opacity 0.4s ease',
                boxShadow:        isAmplitudeDriven && amp > 0.35
                  ? `0 0 5px ${cfg.glow}`
                  : 'none',
                // LLM "thinking" wave — CSS animation with staggered delay
                ...(isLLM && {
                  animation:         `llm-wave 1.8s ease-in-out ${(i / BAR_COUNT) * 1.2}s infinite`,
                  transition:        'background 0.5s ease',
                }),
                // Idle baseline: very faint with no animation
                ...(!isAmplitudeDriven && !isLLM && !isVisible && {
                  opacity: 0.15,
                }),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
