import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  Settings,
  MonitorSpeaker,
  Mic,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useSessionStore } from '../../../store/useSessionStore';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VOICES = [
  { id: 'aria',  label: 'Aria',  sub: 'Warm · Conversational' },
  { id: 'nova',  label: 'Nova',  sub: 'Clear · Professional'  },
  { id: 'echo',  label: 'Echo',  sub: 'Deep · Authoritative'  },
  { id: 'sage',  label: 'Sage',  sub: 'Calm · Thoughtful'     },
  { id: 'orion', label: 'Orion', sub: 'Crisp · Energetic'     },
];

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { selectedVoiceId, devMode, setVoiceId, toggleDevMode } = useSettingsStore();
  const resetSession = useSessionStore((s) => s.resetSession);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener('keydown', trap);
    return () => el.removeEventListener('keydown', trap);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4,6,14,0.70)',
              backdropFilter: 'blur(4px)',
              zIndex: 'var(--z-modal)',
            }}
          />

          {/* Drawer */}
          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '360px',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              zIndex: 'calc(var(--z-modal) + 1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={16} style={{ color: 'var(--accent-indigo)' }} />
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close settings"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  transition: 'color 150ms, background 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              scrollbarWidth: 'none',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
            }}>

              {/* Voice Section */}
              <section>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}>
                  <Volume2 size={15} style={{ color: 'var(--accent-indigo)' }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    Voice
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVoiceId(v.id)}
                      aria-pressed={selectedVoiceId === v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: selectedVoiceId === v.id
                          ? 'rgba(99,102,241,0.12)'
                          : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${selectedVoiceId === v.id ? 'rgba(99,102,241,0.35)' : 'var(--border-subtle)'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedVoiceId !== v.id) {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.06)';
                          e.currentTarget.style.borderColor = 'var(--border-default)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedVoiceId !== v.id) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }
                      }}
                    >
                      <div>
                        <p style={{
                          margin: 0,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          color: selectedVoiceId === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}>
                          {v.label}
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.65rem',
                          color: 'var(--text-ghost)',
                          letterSpacing: '0.03em',
                        }}>
                          {v.sub}
                        </p>
                      </div>
                      {selectedVoiceId === v.id && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--accent-indigo)',
                          boxShadow: '0 0 8px var(--accent-indigo)',
                          flexShrink: 0,
                        }} />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Dev Mode Section */}
              <section>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}>
                  <MonitorSpeaker size={15} style={{ color: 'var(--accent-indigo)' }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    Developer
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(6,9,18,0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}>
                  <div>
                    <p style={{
                      margin: 0,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}>
                      Dev Mode
                    </p>
                    <p style={{
                      margin: '2px 0 0',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}>
                      Show latency metrics &amp; debug panels
                    </p>
                  </div>
                  <button
                    onClick={toggleDevMode}
                    role="switch"
                    aria-checked={devMode}
                    aria-label={`Dev mode ${devMode ? 'on' : 'off'}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: devMode ? 'var(--accent-indigo)' : 'var(--text-ghost)',
                      display: 'flex',
                      transition: 'color 150ms',
                      padding: 0,
                    }}
                  >
                    {devMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </section>

              {/* Mic / Audio Section */}
              <section>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}>
                  <Mic size={15} style={{ color: 'var(--accent-indigo)' }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    Audio
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  padding: '10px 14px',
                  background: 'rgba(6,9,18,0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}>
                  Microphone and speaker settings are managed by your browser. Use system preferences to change the default audio devices.
                </p>
              </section>

              {/* Danger Zone */}
              <section>
                <div style={{
                  border: '1px solid rgba(239,68,68,0.22)',
                  borderRadius: '12px',
                  padding: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--status-error)' }} />
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--status-error)',
                    }}>
                      Danger Zone
                    </span>
                  </div>
                  <p style={{
                    margin: '0 0 14px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>
                    Clear the current session&apos;s transcript and tool history. This cannot be undone.
                  </p>

                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      aria-label="Clear session data"
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(239,68,68,0.10)',
                        border: '1px solid rgba(239,68,68,0.28)',
                        borderRadius: '8px',
                        color: 'var(--status-error)',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.10)';
                      }}
                    >
                      Clear Session Data
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          resetSession();
                          setShowClearConfirm(false);
                        }}
                        style={{
                          padding: '8px 14px',
                          background: 'rgba(239,68,68,0.16)',
                          border: '1px solid rgba(239,68,68,0.35)',
                          borderRadius: '8px',
                          color: 'var(--status-error)',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.82rem',
                          fontWeight: 500,
                        }}
                      >
                        Yes, clear
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        style={{
                          padding: '8px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.82rem',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
