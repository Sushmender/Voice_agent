import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { useLoginMutation, useSignupMutation } from './hooks/useAuth';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<AuthMode>('login');
  const loginMutation = useLoginMutation();
  const signupMutation = useSignupMutation();

  const handleLoginSuccess = () => {
    toast.success('Welcome back! 👋');
    navigate('/console');
  };

  const handleSignupSuccess = async (email: string, password: string) => {
    // Auto-login after signup
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/console');
    } catch {
      toast.error('Account created! Please sign in.');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ── Left panel: Animated decoration ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-bg-deep items-center justify-center">
        {/* Background gradient blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-indigo/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-violet/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-cyan/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
        </div>

        {/* Animated orb */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full bg-accent-indigo/10 blur-2xl scale-150" />
            <div className="absolute inset-0 rounded-full bg-accent-violet/10 blur-xl scale-125" />

            {/* Main orb */}
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-accent-indigo via-accent-violet to-accent-cyan shadow-glow flex items-center justify-center">
              {/* Inner ring */}
              <div className="absolute inset-3 rounded-full border border-white/20 animate-spin-slow" />
              {/* Core */}
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 16.93V21h-2v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Voice AI Agent</h1>
            <p className="text-text-muted text-sm max-w-xs">
              Your intelligent voice assistant. Speak naturally, get instant answers.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {[
              { emoji: '🎙️', label: 'Real-time voice interaction' },
              { emoji: '🧠', label: 'LangGraph-powered reasoning' },
              { emoji: '⚡', label: 'Sub-100ms latency via LiveKit' },
            ].map(({ emoji, label }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 rounded-xl bg-surface/60 border border-border px-4 py-2.5 backdrop-blur-sm"
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-sm text-text-secondary">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Corner gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-deep to-transparent" />
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center shadow-glow-sm">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 16.93V21h-2v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">Voice AI Agent</span>
          </div>

          <div className="glass-card p-8 border-border-bright">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoginForm
                    onSuccess={handleLoginSuccess}
                    onSwitchToSignup={() => setMode('signup')}
                    loginMutation={loginMutation}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SignupForm
                    onSuccess={handleSignupSuccess}
                    onSwitchToLogin={() => setMode('login')}
                    signupMutation={signupMutation}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
