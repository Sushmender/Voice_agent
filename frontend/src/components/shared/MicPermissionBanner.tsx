import { motion } from 'framer-motion';
import { MicOff, ExternalLink, X } from 'lucide-react';


interface MicPermissionBannerProps {
  type: 'denied' | 'notfound';
  onDismiss?: () => void;
}

export function MicPermissionBanner({ type, onDismiss }: MicPermissionBannerProps) {
  const message =
    type === 'denied'
      ? 'Microphone access denied. Please allow access in your browser settings.'
      : 'No microphone detected. Please plug in a microphone and try again.';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(239,68,68,0.10)',
        borderBottom: '1px solid rgba(239,68,68,0.25)',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MicOff size={15} style={{ color: 'var(--status-error)', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem',
          color: '#fca5a5',
          lineHeight: 1.4,
        }}>
          {message}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {type === 'denied' && (
          <a
            href="https://support.google.com/chrome/answer/2693767"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              color: 'var(--status-error)',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.3)',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            How to fix
            <ExternalLink size={11} />
          </a>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss microphone warning"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
