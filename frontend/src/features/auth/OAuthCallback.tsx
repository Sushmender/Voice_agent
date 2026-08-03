import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '../../store/useAppStore';
import { bootstrapSessionAfterLogin } from '../../lib/sessionBootstrap';
import { getMe } from './api/authApi';

/**
 * OAuthCallback
 * -------------
 * Handles the redirect from the backend after Google / GitHub OAuth.
 * URL: /auth/callback?token=<jwt>  (success)
 *      /auth/callback?oauth_error=<reason>  (failure — backend redirects here too)
 *
 * On success: stores JWT in the app store, bootstraps session, navigates to /dashboard.
 * On failure: shows a toast and redirects to /login.
 */
export function OAuthCallback() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const setToken      = useAppStore((s) => s.setToken);
  const setUser       = useAppStore((s) => s.setUser);
  const hasRun        = useRef(false);   // guard against double-invocation in StrictMode

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token      = params.get('token');
    const oauthError = params.get('oauth_error');

    if (oauthError || !token) {
      // Pass the raw error code or message to AuthPage via state
      const isSignupError = oauthError === 'account_not_found';
      navigate('/login', { 
        replace: true, 
        state: { 
          mode: isSignupError ? 'signup' : 'login',
          oauthError: oauthError || 'unknown_error'
        } 
      });
      return;
    }

    const needsOnboarding = params.get('needs_onboarding') === 'true';
    const prefillName = params.get('name') || '';

    // Store token (same localStorage key as email/password login)
    setToken(token);
    toast.success('Signed in successfully! 🎉');

    if (needsOnboarding) {
      navigate('/onboarding', { replace: true, state: { prefillName } });
      return;
    }

    // Check if backend session is still alive and fetch user profile
    Promise.all([
      bootstrapSessionAfterLogin().catch(() => ({ forceNewSession: false })),
      getMe().then(setUser).catch(() => {})
    ])
      .then(([sessionResult]) => {
        navigate('/warming-up', { replace: true, state: { forceNewSession: sessionResult.forceNewSession } });
      });
  }, [params, navigate, setToken, setUser]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        gap: 20,
      }}
    >
      {/* Animated orb spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.15)',
          borderTop: '3px solid #6366f1',
        }}
      />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          color: 'var(--text-muted)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          letterSpacing: '0.06em',
        }}
      >
        Completing sign-in…
      </motion.p>
    </div>
  );
}
