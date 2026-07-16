import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface WarmupHintProps {
  visible: boolean;
}

export function WarmupHint({ visible }: WarmupHintProps) {
  const barRef = useRef<HTMLDivElement>(null);

  // Restart the progress bar animation each time the hint appears
  useEffect(() => {
    if (visible && barRef.current) {
      barRef.current.style.animation = 'none';
      // Force reflow
      void barRef.current.offsetWidth;
      barRef.current.style.animation = 'progress-fill 4s var(--ease-decel) forwards';
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
          className="glass-inner"
          style={{
            padding: '16px 20px',
            maxWidth: '360px',
            width: '100%',
          }}
        >
          {/* Row 1 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}>
            <Zap size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#f59e0b',
            }}>
              Agent pipeline warming up (3–5 sec)
            </span>
          </div>

          {/* Row 2 */}
          <p style={{
            margin: '0 0 12px 26px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}>
            You'll hear "Hi, I'm ready!" when live.
          </p>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
          }}>
            <div
              ref={barRef}
              style={{
                height: '100%',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #f59e0b, #6366f1)',
                width: '0%',
                animation: 'progress-fill 4s var(--ease-decel) forwards',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
