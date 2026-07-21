import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mic,
  Calendar,
  Clock,
  Zap,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../auth/api/authApi';
import type { Session } from '../../types/auth';

// ── Greeting helper ────────────────────────────────────────────────────────────
function greeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name} 👋`;
  if (hour < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
}

// ── Format duration (seconds → "Xm Ys") ───────────────────────────────────────
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ── Relative date ──────────────────────────────────────────────────────────────
function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton({ width, height }: { width?: string; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: width || '100%', height: height || 16, borderRadius: '6px' }}
    />
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, color, delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0, 0, 0.2, 1] }}
      className="glass-card"
      style={{
        flex: 1,
        padding: '24px 28px',
        borderRadius: 'var(--radius-xl)',
        cursor: 'default',
        transition: 'transform 200ms, box-shadow 200ms',
      }}
      whileHover={{ y: -2, boxShadow: '0 0 40px rgba(99,102,241,0.18)' }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: `rgba(${color}, 0.12)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: `rgba(${color}, 1)`,
      }}>
        {icon}
      </div>
      <p style={{
        margin: '16px 0 4px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{
        margin: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.68rem',
        fontWeight: 600,
        letterSpacing: '0.07em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
    </motion.div>
  );
}

// ── Session row ────────────────────────────────────────────────────────────────
function SessionRow({ session, index, onClick }: {
  session: Session;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 + index * 0.06, ease: [0, 0, 0.2, 1] }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        background: hovered ? 'rgba(99,102,241,0.06)' : 'transparent',
        transition: 'background 150ms',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Mic size={16} style={{ color: '#fff' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.session_name || `Voice Session #${session.session_id.slice(-4)}`}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}>
            {session.turn_count} turns
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: 'var(--text-ghost)',
          }}>
            {relativeDate(session.date)}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 4 }}
        transition={{ duration: 0.15 }}
        style={{ color: 'var(--text-ghost)', flexShrink: 0 }}
      >
        <ChevronRight size={14} />
      </motion.div>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const [ctaHovered, setCtaHovered] = React.useState(false);

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    retry: 1,
  });

  const sessions: Session[] = sessionsData?.sessions ?? [];

  // Computed stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter((s) => new Date(s.date).toDateString() === today);
    const totalTurns = sessions.reduce((sum, s) => sum + s.turn_count, 0);
    // Rough estimate: ~30 seconds per turn on average
    const totalSecs = totalTurns * 30;
    return {
      todayCount: todaySessions.length,
      talkTime: totalSecs > 0 ? formatDuration(totalSecs) : '—',
      turns: totalTurns,
    };
  }, [sessions]);

  return (
    <div style={{
      padding: '40px 48px',
      maxWidth: '1000px',
      margin: '0 auto',
      height: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'none',
    }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0, 0, 0.2, 1] }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{
          margin: '0 0 6px',
          fontFamily: "'Inter', sans-serif",
          fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
        }}>
          {user ? greeting(user.name.split(' ')[0]) : 'Dashboard'}
        </h1>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
        }}>
          Your AI voice assistant is ready to talk.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <StatCard
          icon={<Calendar size={20} />}
          label="Sessions Today"
          value={String(stats.todayCount)}
          color="59,130,246"
          delay={0}
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Estimated Talk Time"
          value={stats.talkTime}
          color="99,102,241"
          delay={0.1}
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Total Turns"
          value={String(stats.turns)}
          color="168,85,247"
          delay={0.2}
        />
      </div>

      {/* Start new session CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.25, ease: [0, 0, 0.2, 1] }}
        onClick={() => navigate('/console')}
        onMouseEnter={() => setCtaHovered(true)}
        onMouseLeave={() => setCtaHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '40px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.09) 0%, rgba(168,85,247,0.06) 100%)',
          border: ctaHovered
            ? '1px solid rgba(99,102,241,0.45)'
            : '1px dashed rgba(99,102,241,0.30)',
          borderRadius: 'var(--radius-xl)',
          cursor: 'pointer',
          boxShadow: ctaHovered ? 'var(--shadow-glow-indigo)' : 'none',
          transition: 'all 200ms',
          marginBottom: '32px',
          transform: ctaHovered ? 'scale(0.995)' : 'scale(1)',
          minHeight: '160px',
        }}
      >
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: ctaHovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 200ms',
        }}>
          <Mic size={28} style={{ color: '#fff' }} />
        </div>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Start a new voice session
        </p>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}>
          Connect to your AI assistant instantly
        </p>
      </motion.div>

      {/* Recent sessions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3, ease: [0, 0, 0.2, 1] }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Recent Sessions
          </span>
          {sessions.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: 'var(--accent-indigo)',
                padding: 0,
              }}
            >
              View all
            </button>
          )}
        </div>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 0' }}>
                <Skeleton width="36px" height={36} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 0',
            gap: '12px',
          }}>
            <BarChart3 size={48} style={{ color: 'var(--border-default)', opacity: 0.5 }} />
            <p style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              No sessions yet
            </p>
            <p style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}>
              Start your first conversation with the AI assistant.
            </p>
            <button
              onClick={() => navigate('/console')}
              className="btn-primary"
              style={{ marginTop: '8px', padding: '12px 28px' }}
            >
              Start your first session
            </button>
          </div>
        )}

        {!isLoading && sessions.length > 0 && (
          <div>
            {sessions.slice(0, 10).map((session, i) => (
              <SessionRow
                key={session.session_id}
                session={session}
                index={i}
                onClick={() => navigate('/history')}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
