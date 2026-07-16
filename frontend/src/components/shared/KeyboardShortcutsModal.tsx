import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'Enter'], description: 'Connect / Disconnect' },
  { keys: ['⌘', 'M'],     description: 'Toggle microphone mute' },
  { keys: ['⌘', ','],     description: 'Open settings' },
  { keys: ['?'],           description: 'Show this dialog' },
  { keys: ['Esc'],         description: 'Close dialog' },
];

function Key({ label }: { label: string }) {
  return (
    <kbd style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '26px',
      height: '22px',
      padding: '0 6px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '5px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.7rem',
      fontWeight: 500,
      color: 'var(--text-secondary)',
    }}>
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(4,6,14,0.82)',
              backdropFilter: 'blur(6px)',
              zIndex: 'var(--z-modal)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="glass-card"
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '400px',
              padding: '28px 32px',
              zIndex: 'calc(var(--z-modal) + 1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Keyboard size={18} color="var(--accent-indigo)" />
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Keyboard Shortcuts
                </span>
              </div>
              <button
                onClick={onClose}
                className="btn-icon-circle"
                style={{ width: '30px', height: '30px' }}
              >
                <X size={14} color="var(--text-muted)" />
              </button>
            </div>

            {/* Shortcut list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {SHORTCUTS.map(({ keys, description }) => (
                <div key={description} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {description}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {keys.map((k) => <Key key={k} label={k} />)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
