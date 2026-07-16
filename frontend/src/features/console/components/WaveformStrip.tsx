import type { AgentState, SpeakingState } from '../../../types/agent';

interface WaveformStripProps {
  agentState: AgentState;
  speakingState: SpeakingState;
  bars?: number[]; // 0-1 amplitude, length 20
}

const BAR_COUNT = 20;

function barColor(agentState: AgentState, speakingState: SpeakingState) {
  if (agentState !== 'CONNECTED') {
    if (agentState === 'WARMING_UP') return '#f59e0b';
    return 'var(--text-ghost)';
  }
  if (speakingState === 'LISTENING') return '#3b82f6';
  if (speakingState === 'SPEAKING') return '#6366f1';
  return 'var(--text-ghost)';
}

export function WaveformStrip({ agentState, speakingState, bars = [] }: WaveformStripProps) {
  const isActive =
    (agentState === 'CONNECTED' && (speakingState === 'LISTENING' || speakingState === 'SPEAKING')) ||
    agentState === 'WARMING_UP';

  const color = barColor(agentState, speakingState);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '2px',
      width: '200px',
      height: '40px',
    }}>
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const amp = bars[i] ?? 0;
        const minH = 3;
        const maxH = 36;
        const h = isActive
          ? Math.max(minH, amp * maxH)
          : minH + Math.sin((i / BAR_COUNT) * Math.PI) * 4; // gentle idle curve

        return (
          <div
            key={i}
            style={{
              width: '2px',
              height: `${h}px`,
              borderRadius: '2px',
              background: color,
              transformOrigin: 'bottom',
              transition: 'height 0.08s ease, background 0.4s ease',
              animationDelay: `${i * 0.04}s`,
            }}
          />
        );
      })}
    </div>
  );
}
