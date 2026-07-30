import React from 'react';
import type { AgentState, PipelineStage } from '../../../types/agent';

interface PipelineStripProps {
  agentState:    AgentState;
  pipelineStage: PipelineStage;
}

// ── Stage metadata ────────────────────────────────────────────────────────────
const STAGES = [
  {
    key:   'ASR_ACTIVE' as PipelineStage,
    label: 'ASR',
    color: '#3b82f6',          // blue
    bg:    'rgba(59,130,246,0.12)',
    glow:  'rgba(59,130,246,0.45)',
  },
  {
    key:   'LLM_ACTIVE' as PipelineStage,
    label: 'LLM',
    color: '#6366f1',          // indigo
    bg:    'rgba(99,102,241,0.12)',
    glow:  'rgba(99,102,241,0.45)',
  },
  {
    key:   'TTS_ACTIVE' as PipelineStage,
    label: 'TTS',
    color: '#a855f7',          // purple
    bg:    'rgba(168,85,247,0.12)',
    glow:  'rgba(168,85,247,0.45)',
  },
] as const;

// ── Animated connector between stages ────────────────────────────────────────
function Connector({ flowing, color }: { flowing: boolean; color: string }) {
  return (
    <div style={{
      position: 'relative',
      width:    '32px',
      height:   '20px',
      display:  'flex',
      alignItems: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Static line */}
      <div style={{
        position: 'absolute',
        left:     0,
        right:    0,
        height:   '1px',
        background: flowing
          ? `linear-gradient(to right, ${color}80, ${color})`
          : 'var(--border-subtle)',
        transition: 'background 400ms ease',
      }} />

      {/* Arrow head */}
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        style={{
          position:   'absolute',
          right:      '0px',
          opacity:    flowing ? 1 : 0.3,
          transition: 'opacity 400ms ease',
        }}
      >
        <polyline
          points="1,1 7,4 1,7"
          fill="none"
          stroke={flowing ? color : 'var(--text-ghost)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Flowing pulse dot */}
      {flowing && (
        <div style={{
          position:    'absolute',
          top:         '50%',
          width:       '5px',
          height:      '5px',
          borderRadius: '50%',
          background:  color,
          marginTop:   '-2.5px',
          boxShadow:   `0 0 6px ${color}`,
          animation:   'pipeline-flow 1.2s linear infinite',
        }} />
      )}
    </div>
  );
}

// ── Stage badge ───────────────────────────────────────────────────────────────
function StageBadge({
  stage,
  active,
}: {
  stage: typeof STAGES[number];
  active: boolean;
}) {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '6px',
        padding:        '5px 11px 5px 8px',
        borderRadius:   '100px',
        fontFamily:     "'JetBrains Mono', monospace",
        fontSize:       '0.68rem',
        fontWeight:     700,
        letterSpacing:  '0.06em',
        userSelect:     'none',
        position:       'relative',
        transition:     'all 250ms cubic-bezier(0.34,1.56,0.64,1)',
        // Active: vivid colors + glow
        background:     active ? stage.bg     : 'var(--bg-elevated)',
        color:          active ? stage.color  : 'var(--text-ghost)',
        border:         active
          ? `1px solid ${stage.color}55`
          : '1px solid var(--border-subtle)',
        boxShadow:      active
          ? `0 0 16px ${stage.glow}, inset 0 0 8px ${stage.bg}`
          : 'none',
        transform:      active ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {/* Activity dot */}
      <div style={{
        width:        '5px',
        height:       '5px',
        borderRadius: '50%',
        background:   active ? stage.color : 'var(--text-ghost)',
        boxShadow:    active ? `0 0 6px ${stage.color}` : 'none',
        animation:    active ? 'dot-pulse 1s ease-in-out infinite' : 'none',
        flexShrink:   0,
        transition:   'all 250ms ease',
      }} />

      {/* Label */}
      <span>{stage.label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PipelineStrip({ agentState, pipelineStage }: PipelineStripProps) {
  if (agentState === 'IDLE' || agentState === 'ERROR') return null;

  const activeIndex = STAGES.findIndex((s) => s.key === pipelineStage);

  return (
    <div
      role="status"
      aria-label={`Pipeline stage: ${pipelineStage}`}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '0px',
        padding:     '4px 8px',
        borderRadius: '100px',
        background:  'rgba(8,11,18,0.6)',
        border:      '1px solid var(--border-subtle)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {STAGES.map((stage, i) => {
        const isActive  = stage.key === pipelineStage;
        // The connector flows when the PRECEDING stage is active
        // (data is flowing from previous stage into this one)
        const flowing   = activeIndex >= i;
        const nextStage = STAGES[i + 1];

        return (
          <React.Fragment key={stage.key}>
            <StageBadge
              stage={stage}
              active={isActive}
            />
            {i < STAGES.length - 1 && nextStage && (
              <Connector
                flowing={flowing && pipelineStage !== 'QUIET' && pipelineStage !== 'IDLE'}
                color={stage.color}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
