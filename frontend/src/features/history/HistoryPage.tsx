import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Download, Copy, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSessions, getConversations } from '../auth/api/authApi';
import type { Session, ConversationTurn } from '../../types/auth';

// ── Helpers ────────────────────────────────────────────────────────────────────
function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Session list card ──────────────────────────────────────────────────────────
function SessionCard({
  session,
  isActive,
  onClick,
  opacity,
}: {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  opacity: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '6px',
        cursor: 'pointer',
        background: isActive ? 'rgba(99,102,241,0.14)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
        opacity,
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <p style={{
        margin: '0 0 4px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.875rem',
        fontWeight: 500,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {session.session_name || `Voice Session #${session.session_id.slice(-4)}`}
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
  );
}

// ── Transcript bubble (read-only) ──────────────────────────────────────────────
function HistoryBubble({ turn }: { turn: ConversationTurn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* User */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        borderLeft: '2px solid var(--status-connected)',
        background: 'rgba(34,197,94,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--status-connected)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            You
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.62rem',
            color: 'var(--text-ghost)',
          }}>
            {turn.Time}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.88rem',
          color: '#86efac',
          lineHeight: 1.55,
        }}>
          {turn.User_query}
        </p>
      </div>
      {/* Agent */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        borderLeft: '2px solid var(--accent-indigo)',
        background: 'rgba(99,102,241,0.07)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--accent-indigo)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Agent
          </span>
          {turn.Tools_Used && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.62rem',
              color: 'var(--accent-violet)',
              background: 'rgba(168,85,247,0.1)',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(168,85,247,0.2)',
            }}>
              🔧 {turn.Tools_Used}
            </span>
          )}
        </div>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.88rem',
          color: '#a5b4fc',
          lineHeight: 1.55,
        }}>
          {turn.LLM_response}
        </p>
      </div>
    </div>
  );
}

// ── Main History page ──────────────────────────────────────────────────────────
export function HistoryPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'interrupted'>('all');
  const [copied, setCopied] = useState(false);
  const debouncedSearch = useDebounce(search, 200);

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  });

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations', selectedSessionId],
    queryFn: () => getConversations(selectedSessionId ?? undefined),
    enabled: !!selectedSessionId,
  });

  const sessions: Session[] = sessionsData?.sessions ?? [];
  const conversations: ConversationTurn[] = convsData?.conversations ?? [];

  // Filter
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((s) =>
        (s.session_name || '').toLowerCase().includes(q) ||
        s.date.includes(q)
      );
    }
    return result;
  }, [sessions, debouncedSearch]);

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId);

  // Download transcript
  function handleDownload() {
    if (!conversations.length || !selectedSession) return;
    const lines = conversations.map((t) =>
      `[${t.Time}] You: ${t.User_query}\n[${t.Time}] Agent: ${t.LLM_response}`
    );
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${selectedSession.session_id.slice(-8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Copy transcript
  async function handleCopy() {
    if (!conversations.length) return;
    const text = conversations
      .map((t) => `You: ${t.User_query}\nAgent: ${t.LLM_response}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Session list */}
      <div style={{
        width: '38%',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* List header */}
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Session History
          </h2>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search sessions"
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '34px',
                paddingRight: '12px',
                background: 'rgba(6,9,18,0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-indigo)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            />
          </div>
          {/* Filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'completed', 'interrupted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  border: `1px solid ${filterStatus === f ? 'rgba(99,102,241,0.4)' : 'var(--border-subtle)'}`,
                  background: filterStatus === f ? 'rgba(99,102,241,0.14)' : 'transparent',
                  color: filterStatus === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                  transition: 'all 150ms',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          padding: '12px 16px',
        }}>
          {sessionsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: '62px', borderRadius: '10px' }} />
              ))}
            </div>
          )}

          {!sessionsLoading && filteredSessions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-ghost)',
            }}>
              <Mic size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.88rem',
              }}>
                {search ? 'No sessions match your search' : 'No sessions yet'}
              </p>
            </div>
          )}

          {filteredSessions.map((session, i) => (
            <motion.div
              key={session.session_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <SessionCard
                session={session}
                isActive={session.session_id === selectedSessionId}
                opacity={
                  debouncedSearch && !session.session_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    ? 0.3
                    : 1
                }
                onClick={() => setSelectedSessionId(session.session_id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Transcript viewer */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {!selectedSessionId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <Mic size={56} style={{ color: 'var(--border-default)', opacity: 0.4 }} />
              <p style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
                Select a session
              </p>
              <p style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
              }}>
                Choose a conversation from the list on the left.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedSessionId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Meta bar */}
              <div style={{
                padding: '20px 32px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}>
                <div>
                  <h3 style={{
                    margin: '0 0 4px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {selectedSession?.session_name || `Voice Session #${selectedSessionId?.slice(-4)}`}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}>
                    {selectedSession?.turn_count} turns · {selectedSession ? relativeDate(selectedSession.date) : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleDownload}
                    aria-label="Download transcript"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <Download size={13} />
                    Download .txt
                  </button>
                  <button
                    onClick={handleCopy}
                    aria-label="Copy transcript to clipboard"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: copied ? 'var(--status-connected)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      transition: 'all 150ms',
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Transcript body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'none',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {convsLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ height: '60px', borderRadius: '8px' }} />
                        <div className="skeleton" style={{ height: '72px', borderRadius: '8px' }} />
                      </div>
                    ))}
                  </div>
                )}

                {!convsLoading && conversations.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--text-ghost)',
                  }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.88rem' }}>
                      No transcript data available for this session.
                    </p>
                  </div>
                )}

                {conversations.map((turn, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <HistoryBubble turn={turn} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
