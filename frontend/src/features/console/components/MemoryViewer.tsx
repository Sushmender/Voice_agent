import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Brain, RotateCcw, AlertTriangle } from 'lucide-react';
import type { TranscriptMessage } from '../../../types/agent';

interface MemoryViewerProps {
  transcripts: TranscriptMessage[];
  onClearSession: () => void;
  isConnected: boolean;
}

export function MemoryViewer({ transcripts, onClearSession, isConnected }: MemoryViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const turnCount = transcripts.filter((t) => t.role === 'user').length;

  function handleClear() {
    if (isConnected) {
      setShowConfirm(true);
    } else {
      onClearSession();
    }
  }

  return (
    <div
      className="glass-inner"
      style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-label="Toggle memory viewer"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={14} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            Session Memory
          </span>
          {turnCount > 0 && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.65rem',
              color: 'var(--accent-indigo)',
              background: 'rgba(99,102,241,0.12)',
              padding: '1px 7px',
              borderRadius: '100px',
              border: '1px solid rgba(99,102,241,0.22)',
            }}>
              {turnCount} turns
            </span>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)' }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {/* Turn summary */}
              {transcripts.length === 0 ? (
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  color: 'var(--text-ghost)',
                  margin: 0,
                  textAlign: 'center',
                  padding: '12px 0',
                }}>
                  No conversation turns yet
                </p>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                }}>
                  {transcripts.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'flex-start',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: t.role === 'user'
                          ? 'rgba(34,197,94,0.05)'
                          : 'rgba(99,102,241,0.06)',
                        borderLeft: `2px solid ${t.role === 'user' ? 'var(--status-connected)' : 'var(--accent-indigo)'}`,
                      }}
                    >
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        color: t.role === 'user' ? 'var(--status-connected)' : 'var(--accent-indigo)',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                        marginTop: '1px',
                      }}>
                        {t.role === 'user' ? 'YOU' : 'AI'}
                      </span>
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {t.isTyping ? '...' : t.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Clear button */}
              <button
                onClick={handleClear}
                aria-label="Clear session memory"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  borderRadius: '8px',
                  color: 'var(--status-error)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  transition: 'all 150ms',
                  alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                }}
              >
                <RotateCcw size={12} />
                Clear Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation dialog (inline, appears when connected) */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              zIndex: 200,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={14} style={{ color: 'var(--status-error)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}>
                Clearing the session will end the current conversation. Are you sure?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onClearSession();
                }}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  color: 'var(--status-error)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                Clear Session
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
