import React from 'react';
import type { AgentState, SpeakingState } from '../../../types/agent';

interface PipelineStripProps {
  agentState: AgentState;
  speakingState: SpeakingState;
}

type PipelineStage = 'ASR' | 'LLM' | 'TTS' | null;

function inferActiveStage(agentState: AgentState, speakingState: SpeakingState): PipelineStage {
  if (agentState !== 'CONNECTED') return null;
  if (speakingState === 'LISTENING') return 'ASR';
  if (speakingState === 'SPEAKING') return 'TTS';
  return 'LLM'; // QUIET: last known transition is LLM thinking
}

const STAGES: { key: PipelineStage; label: string; sub: string; color: string }[] = [
  { key: 'ASR', label: 'ASR', sub: 'Groq', color: '#3b82f6' },
  { key: 'LLM', label: 'LLM', sub: 'LangGraph', color: '#6366f1' },
  { key: 'TTS', label: 'TTS', sub: 'Cartesia', color: '#a855f7' },
];

export function PipelineStrip({ agentState, speakingState }: PipelineStripProps) {
  const activeStage = inferActiveStage(agentState, speakingState);

  if (agentState === 'IDLE' || agentState === 'ERROR') return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {STAGES.map((stage, i) => {
        const isActive = stage.key === activeStage;
        return (
          <React.Fragment key={stage.key}>
            <div
              style={{
                padding: '5px 10px',
                borderRadius: '100px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 300ms ease',
                background: isActive ? `${stage.color}22` : 'var(--bg-elevated)',
                color: isActive ? stage.color : 'var(--text-ghost)',
                border: isActive ? `1px solid ${stage.color}60` : '1px solid var(--border-subtle)',
                boxShadow: isActive ? `0 0 12px ${stage.color}44` : 'none',
              }}
            >
              {/* Activity dot */}
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: isActive ? stage.color : 'var(--text-ghost)',
                animation: isActive ? 'dot-pulse 1s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }} />
              {stage.label}
            </div>

            {/* Arrow connector */}
            {i < STAGES.length - 1 && (
              <svg width="16" height="10" viewBox="0 0 16 10" style={{ opacity: 0.4, flexShrink: 0 }}>
                <line x1="0" y1="5" x2="11" y2="5" stroke="var(--text-ghost)" strokeWidth="1.5" />
                <polyline points="8,2 13,5 8,8" fill="none" stroke="var(--text-ghost)" strokeWidth="1.5" />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
