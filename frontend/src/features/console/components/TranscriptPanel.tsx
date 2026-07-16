import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2 } from 'lucide-react';
import { useSessionStore } from '../../../store/useSessionStore';
import { toasts } from '../../../lib/toast';
import type { SpeakingState } from '../../../types/agent';

interface TranscriptPanelProps {
  speakingState: SpeakingState;
}

function formatTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

// ── Individual bubble ─────────────────────────────────────────────────────────
interface BubbleProps {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  isTyping?: boolean;
}

function TranscriptBubble({ role, text, timestamp, isTyping }: BubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
      style={{
        padding: '12px 16px',
        borderRadius: '12px',
        borderLeft: `2px solid ${isUser ? '#22c55e' : '#6366f1'}`,
        background: isUser ? 'rgba(34,197,94,0.06)' : 'rgba(99,102,241,0.07)',
        maxWidth: '100%',
        wordBreak: 'break-word',
        lineHeight: 1.55,
        fontSize: '0.88rem',
        color: isUser ? '#86efac' : '#a5b4fc',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isUser ? '#22c55e' : '#6366f1',
        }}>
          {isUser ? 'You' : 'Agent'}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.62rem',
          color: '#2d3748',
        }}>
          {formatTime(timestamp)}
        </span>
      </div>

      {/* Content */}
      {isTyping ? (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
          {[0, 0.18, 0.36].map((delay, i) => (
            <span key={i} style={{
              display: 'inline-block',
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: 'currentColor',
              animation: `dot-pulse 1s ease-in-out ${delay}s infinite`,
            }} />
          ))}
        </div>
      ) : (
        <p style={{ margin: 0 }}>{text}</p>
      )}
    </motion.div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export function TranscriptPanel({ speakingState }: TranscriptPanelProps) {
  const transcripts = useSessionStore((s) => s.transcripts);
  const clearTranscripts = useSessionStore((s) => s.clearTranscripts);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [transcripts.length]);

  const handleCopy = async () => {
    const text = transcripts
      .map((t) => `[${formatTime(t.timestamp)}] ${t.role === 'user' ? 'You' : 'Agent'}: ${t.text}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    toasts.copied();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8,11,18,0.5)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
        }}>
          TRANSCRIPT
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleCopy}
            disabled={transcripts.length === 0}
            title="Copy transcript"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px 8px',
              fontSize: '0.75rem', borderRadius: '6px',
              transition: 'color 150ms, background 150ms',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
            className="hover:text-text-primary hover:bg-bg-hover"
          >
            <Copy size={13} />
            <span>Copy</span>
          </button>
          <button
            onClick={clearTranscripts}
            disabled={transcripts.length === 0}
            title="Clear transcript"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px 8px',
              fontSize: '0.75rem', borderRadius: '6px',
              transition: 'color 150ms, background 150ms',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
            className="hover:text-text-primary hover:bg-bg-hover"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          scrollbarWidth: 'none',
        }}
      >
        <AnimatePresence>
          {transcripts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '40px 0',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: '48px', height: '48px',
                borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-ghost)">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  No messages yet
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-ghost)' }}>
                  Connect and start speaking
                </p>
              </div>
            </motion.div>
          ) : (
            transcripts.map((msg) => (
              <TranscriptBubble
                key={msg.id}
                role={msg.role}
                text={msg.text}
                timestamp={msg.timestamp}
                isTyping={msg.isTyping}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Barge-in hint — only during SPEAKING */}
      <AnimatePresence>
        {speakingState === 'SPEAKING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              height: '36px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(99,102,241,0.04)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: 'var(--text-ghost)',
              flexShrink: 0,
            }}
          >
            Interrupt anytime — just speak
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
