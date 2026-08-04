import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { LatencyEntry } from '../../../types/agent';
import { DownloadIcon } from 'lucide-react';

interface LatencyPanelProps {
  entries: LatencyEntry[];
}

function latencyColor(ms: number): string {
  if (ms < 600) return '#22c55e';
  if (ms < 1200) return '#f59e0b';
  return '#ef4444';
}

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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,16,24,0.95)',
      border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: '8px',
      padding: '8px 12px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      gap: '4px 16px',
    }}>
      <p style={{ gridColumn: '1 / -1', margin: '0 0 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-ghost)', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
        Turn #{label}
      </p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: p.fill }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}ms</span>
        </div>
      ))}
    </div>
  );
}

export function LatencyPanel({ entries }: LatencyPanelProps) {
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    if (entries.length === 0) return { avg: '0.000', p95: '0.000', avgColor: '#22c55e', p95Color: '#22c55e' };
    const totals = entries.map((e) => e.total).sort((a, b) => a - b);
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
    const p95idx = Math.floor(totals.length * 0.95);
    const p95 = totals[Math.min(p95idx, totals.length - 1)];
    return {
      avg: avg.toFixed(3),
      p95: p95.toFixed(3),
      avgColor: latencyColor(avg),
      p95Color: latencyColor(p95),
    };
  }, [entries]);

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (entries.length === 0) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-ghost)' }}>
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>
          Latency data will appear after first turn
        </p>
      </div>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => b.turn - a.turn);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          LATENCY METRICS
        </span>
        <button
          onClick={handleExport}
          style={{
            background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px',
            padding: '4px 8px', color: 'var(--text-secondary)', fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace"
          }}
        >
          <DownloadIcon size={12} />
          {copied ? 'COPIED!' : 'EXPORT JSON'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <MetricCard label="Avg Total" value={stats.avg} unit="ms" color={stats.avgColor} />
        <MetricCard label="P95 Total" value={stats.p95} unit="ms" color={stats.p95Color} />
        <MetricCard label="Turns" value={entries.length} color="var(--text-secondary)" />
      </div>

      <div style={{ background: 'rgba(6,9,18,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 4px 0px' }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={entries} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="turn" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: '#4a5568' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: '#4a5568' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem' }} />
            <Bar dataKey="asr" name="ASR" stackId="a" fill="#3b82f6" />
            <Bar dataKey="llm" name="LLM" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="tool" name="Tool" stackId="a" fill="#ec4899" />
            <Bar dataKey="tts" name="TTS" stackId="a" fill="#10b981" />
            <Bar dataKey="mongo_fetch" name="Mongo Fetch" stackId="a" fill="#f59e0b" />
            <Bar dataKey="mongo_save" name="Mongo Save" stackId="a" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX: 'auto', background: 'rgba(6,9,18,0.6)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Turn</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>ASR</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>LLM</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Tool</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>TTS</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Tokens (I/O)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((e) => (
              <tr key={e.turn} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <td style={{ padding: '8px', color: 'var(--text-primary)' }}>#{e.turn}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#3b82f6' }}>{(e.asr || 0).toFixed(3)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#8b5cf6' }}>{(e.llm || 0).toFixed(3)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#ec4899' }}>{(e.tool || 0).toFixed(3)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>{(e.tts || 0).toFixed(3)}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{e.input_tokens || 0}/{e.output_tokens || 0}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: latencyColor(e.total) }}>{(e.total || 0).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
