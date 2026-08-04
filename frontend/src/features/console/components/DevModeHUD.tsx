import { useSessionStore } from '../../../store/useSessionStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

export function DevModeHUD() {
  const { devMode } = useSettingsStore();
  const { latencyHistory } = useSessionStore();

  if (!devMode) return null;

  const lastEntry = latencyHistory[latencyHistory.length - 1];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        background: 'rgba(6,9,18,0.85)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-indigo)',
            animation: 'pulse 2s infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            color: 'var(--accent-indigo)',
            letterSpacing: '0.05em',
          }}
        >
          DEV ACTIVE
        </span>
      </div>

      {lastEntry ? (
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <Stat label="ASR" value={lastEntry.asr} color="#3b82f6" />
          <Stat label="LLM" value={lastEntry.llm} color="#8b5cf6" />
          <Stat label="TTS" value={lastEntry.tts} color="#10b981" />
          <Stat label="TOT" value={lastEntry.total} color={lastEntry.total > 1200 ? '#ef4444' : '#22c55e'} />
        </div>
      ) : (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-ghost)' }}>
          Waiting for turn...
        </span>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 600, color }}>
        {Math.round(value)}<span style={{ fontSize: '0.5rem', opacity: 0.7 }}>ms</span>
      </span>
    </div>
  );
}
