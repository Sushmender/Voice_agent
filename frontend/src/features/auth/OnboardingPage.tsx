import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Loader2 } from 'lucide-react';
import { useUpdateNameMutation } from './hooks/useAuth';

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState(location.state?.prefillName || '');
  const updateNameMutation = useUpdateNameMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await updateNameMutation.mutateAsync(name.trim());
      navigate('/dashboard', { replace: true, state: { forceNewSession: false } });
    } catch {
      // Error handled by the mutation's onError (toast)
    }
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ zIndex: 'var(--z-content)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card w-full"
          style={{ maxWidth: 440, padding: '44px 40px' }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-indigo)',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} style={{ width: 18, height: 18 }}>
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/>
              </svg>
            </div>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              VoiceAgent
            </span>
          </div>

          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 style={{
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: 6,
            }}>
              Welcome to VoiceOps!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              What should we call you?
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-placeholder)',
                pointerEvents: 'none',
              }}>
                <User size={16} />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="input-field"
                required
                style={{ paddingLeft: 40 }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={updateNameMutation.isPending || !name.trim()}
              className="btn-primary"
              style={{ marginTop: 8 }}
            >
              {updateNameMutation.isPending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={16} style={{ animation: 'connecting-spin 0.8s linear infinite' }} />
                  Saving...
                </span>
              ) : (
                'Continue to Dashboard'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
