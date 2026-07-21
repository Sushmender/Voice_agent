import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench,
  Search,
  Globe,
  Brain,
  Zap,
  Database,
  Code2,
} from 'lucide-react';
import type { ToolEvent } from '../../../types/agent';

// ── Tool icon mapping ──────────────────────────────────────────────────────────
function getToolIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('search') || n.includes('find')) return <Search size={14} />;
  if (n.includes('web') || n.includes('fetch') || n.includes('http')) return <Globe size={14} />;
  if (n.includes('memory') || n.includes('store') || n.includes('save')) return <Database size={14} />;
  if (n.includes('brain') || n.includes('think') || n.includes('reason')) return <Brain size={14} />;
  if (n.includes('execute') || n.includes('run') || n.includes('code')) return <Code2 size={14} />;
  if (n.includes('zap') || n.includes('action') || n.includes('quick')) return <Zap size={14} />;
  return <Wrench size={14} />;
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: ToolEvent['status'] }) {
  if (status === 'running') {
    return (
      <span style={{ color: 'var(--status-connecting)', display: 'flex' }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span style={{ color: 'var(--status-connected)' }}>
        <CheckCircle2 size={14} />
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--status-error)' }}>
      <XCircle size={14} />
    </span>
  );
}

// ── Single timeline item ───────────────────────────────────────────────────────
function TimelineItem({ event, index }: { event: ToolEvent; index: number }) {
  const statusColor =
    event.status === 'running'
      ? 'var(--status-connecting)'
      : event.status === 'success'
      ? 'var(--status-connected)'
      : 'var(--status-error)';

  const ts = new Date(event.timestamp);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0, 0, 0.2, 1] }}
      style={{
        display: 'flex',
        gap: '12px',
        position: 'relative',
        paddingBottom: '16px',
      }}
    >
      {/* Timeline line */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        width: '28px',
      }}>
        {/* Node */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: `rgba(${
            event.status === 'running' ? '245,158,11' :
            event.status === 'success' ? '34,197,94' : '239,68,68'
          }, 0.12)`,
          border: `1px solid ${statusColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: statusColor,
          flexShrink: 0,
          zIndex: 1,
        }}>
          {getToolIcon(event.name)}
        </div>
        {/* Connector line */}
        <div style={{
          width: '1px',
          flex: 1,
          background: 'var(--border-subtle)',
          marginTop: '4px',
          minHeight: '16px',
        }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: '4px' }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StatusIcon status={event.status} />
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              {event.name}
            </span>
            {event.turn !== undefined && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: 'var(--text-ghost)',
                background: 'rgba(99,102,241,0.08)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
              }}>
                turn {event.turn}
              </span>
            )}
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.62rem',
            color: 'var(--text-ghost)',
            flexShrink: 0,
          }}>
            {timeStr}
          </span>
        </div>

        {/* Output preview */}
        {event.output_preview && (
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            background: 'rgba(6,9,18,0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 10px',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }}>
            {event.output_preview}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ToolTimeline component ────────────────────────────────────────────────
interface ToolTimelineProps {
  events: ToolEvent[];
}

export function ToolTimeline({ events }: ToolTimelineProps) {
  if (events.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        gap: '8px',
        color: 'var(--text-ghost)',
      }}>
        <Wrench size={24} style={{ opacity: 0.4 }} />
        <p style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          No tool calls yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          TOOL TIMELINE
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: 'var(--accent-indigo)',
          background: 'rgba(99,102,241,0.1)',
          padding: '2px 8px',
          borderRadius: '100px',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          {events.length} calls
        </span>
      </div>

      {/* Timeline */}
      <AnimatePresence>
        {events.map((evt, i) => (
          <TimelineItem key={evt.id} event={evt} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}
