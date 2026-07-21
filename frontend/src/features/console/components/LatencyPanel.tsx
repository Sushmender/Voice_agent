import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { LatencyEntry } from '../../../types/agent';

interface LatencyPanelProps {
  entries: LatencyEntry[];
}

// ── Color coding thresholds ────────────────────────────────────────────────────
function latencyColor(ms: number): string {
  if (ms < 600) return '#22c55e';   // green — fast
  if (ms < 1200) return '#f59e0b';  // amber — acceptable
  return '#ef4444';                 // red   — slow
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,16,24,0.95)',
      border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: '8px',
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
    }}>
      <p style={{
        margin: '0 0 6px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.65rem',
        color: 'var(--text-ghost)',
        letterSpacing: '0.04em',
      }}>
        Turn {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{
          margin: '2px 0',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          color: p.color,
        }}>
          {p.name}: {p.value}ms
        </p>
      ))}
    </div>
  );
}

// ── Metric card ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color }: {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
}) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(6,9,18,0.6)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '10px',
      padding: '12px 14px',
    }}>
      <p style={{
        margin: '0 0 4px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.62rem',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '1.2rem',
        fontWeight: 700,
        color,
        letterSpacing: '-0.02em',
      }}>
        {value}
        {unit && (
          <span style={{ fontSize: '0.72rem', fontWeight: 400, marginLeft: '3px', color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

// ── Main LatencyPanel ──────────────────────────────────────────────────────────
export function LatencyPanel({ entries }: LatencyPanelProps) {
  const stats = useMemo(() => {
    if (entries.length === 0) return { avg: 0, p95: 0, avgColor: '#22c55e', p95Color: '#22c55e' };
    const totals = entries.map((e) => e.total).sort((a, b) => a - b);
    const avg = Math.round(totals.reduce((s, v) => s + v, 0) / totals.length);
    const p95idx = Math.floor(totals.length * 0.95);
    const p95 = totals[Math.min(p95idx, totals.length - 1)];
    return {
      avg,
      p95,
      avgColor: latencyColor(avg),
      p95Color: latencyColor(p95),
    };
  }, [entries]);

  const chartData = entries.map((e) => ({
    turn: e.turn,
    TTFB: e.ttfb,
    Total: e.total,
  }));

  if (entries.length === 0) {
    return (
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-ghost)',
      }}>
        <p style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          textAlign: 'center',
        }}>
          Latency data will appear after first turn
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          LATENCY METRICS
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.62rem',
          color: 'var(--accent-indigo)',
          background: 'rgba(99,102,241,0.1)',
          padding: '2px 7px',
          borderRadius: '100px',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          DEV MODE
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <MetricCard label="Avg Total" value={stats.avg} unit="ms" color={stats.avgColor} />
        <MetricCard label="P95 Total" value={stats.p95} unit="ms" color={stats.p95Color} />
        <MetricCard label="Turns" value={entries.length} color="var(--text-secondary)" />
      </div>

      {/* Chart */}
      <div style={{
        background: 'rgba(6,9,18,0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '12px 4px 8px',
      }}>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="ttfbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
            <XAxis
              dataKey="turn"
              tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: '#4a5568' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'turn', position: 'insideBottomRight', fill: '#4a5568', fontSize: 9 }}
            />
            <YAxis
              tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: '#4a5568' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <ReferenceLine y={600} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.4} />
            <ReferenceLine y={1200} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.4} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="TTFB"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#ttfbGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="Total"
              stroke="#6366f1"
              strokeWidth={1.5}
              fill="url(#totalGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        paddingLeft: '4px',
      }}>
        {[
          { color: '#3b82f6', label: 'TTFB' },
          { color: '#6366f1', label: 'Total' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '16px', height: '2px', background: l.color, borderRadius: '2px' }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              color: 'var(--text-ghost)',
            }}>
              {l.label}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
          <div style={{ width: '16px', height: '1px', background: '#22c55e', borderRadius: '1px', opacity: 0.5 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#22c55e', opacity: 0.5 }}>600ms</span>
          <div style={{ width: '16px', height: '1px', background: '#f59e0b', borderRadius: '1px', opacity: 0.5 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#f59e0b', opacity: 0.5 }}>1.2s</span>
        </div>
      </div>
    </div>
  );
}
