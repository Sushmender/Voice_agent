import { WifiOff } from 'lucide-react';
import { ConnectionQuality as LKQuality } from 'livekit-client';

interface ConnectionQualityProps {
  quality: LKQuality;
  pingMs?: number;
}

function qualityToLevel(q: LKQuality): 0 | 1 | 2 | 3 | 4 {
  switch (q) {
    case LKQuality.Excellent: return 4;
    case LKQuality.Good: return 3;
    case LKQuality.Poor: return 2;
    case LKQuality.Lost: return 0;
    default: return 0;
  }
}

function qualityColor(level: number): string {
  if (level >= 4) return '#22c55e';
  if (level >= 3) return '#86efac';
  if (level >= 2) return '#f59e0b';
  return '#ef4444';
}

export function ConnectionQualityIndicator({ quality, pingMs }: ConnectionQualityProps) {
  const level = qualityToLevel(quality);
  const color = qualityColor(level);

  if (quality === LKQuality.Lost) {
    return (
      <div title="Connection lost" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <WifiOff size={14} color="#ef4444" />
      </div>
    );
  }

  return (
    <div
      title={pingMs ? `${pingMs}ms` : undefined}
      style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}
    >
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          style={{
            width: '3px',
            height: `${bar * 3}px`,
            borderRadius: '1px',
            background: bar <= level ? color : 'var(--text-ghost)',
            transition: 'background 300ms',
          }}
        />
      ))}
    </div>
  );
}
