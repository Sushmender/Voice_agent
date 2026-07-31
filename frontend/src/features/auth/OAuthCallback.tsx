import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '../../store/useAppStore';
import { bootstrapSessionAfterLogin } from '../../lib/sessionBootstrap';

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
  const hasRun        = useRef(false);   // guard against double-invocation in StrictMode

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token      = params.get('token');
    const oauthError = params.get('oauth_error');

    if (oauthError || !token) {
      const messages: Record<string, string> = {
        google_denied:    'Google sign-in was cancelled.',
        google_token:     'Google authentication failed. Please try again.',
        google_userinfo:  'Could not fetch Google profile. Please try again.',
        google_no_email:  'Your Google account has no public email.',
        github_denied:    'GitHub sign-in was cancelled.',
        github_token:     'GitHub authentication failed. Please try again.',
        github_no_email:  'Your GitHub account has no verified email. Please add one at github.com/settings/emails.',
      };
      toast.error(messages[oauthError ?? ''] ?? 'OAuth sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    // Store token (same localStorage key as email/password login)
    setToken(token);
    toast.success('Signed in successfully! 🎉');

    // Check if backend session is still alive
    bootstrapSessionAfterLogin()
      .then(({ forceNewSession }) => {
        navigate('/dashboard', { replace: true, state: { forceNewSession } });
      })
      .catch(() => {
        navigate('/dashboard', { replace: true, state: { forceNewSession: false } });
      });
  }, [params, navigate, setToken]);

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
