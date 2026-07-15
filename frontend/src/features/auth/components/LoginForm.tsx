import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '../schemas/authSchemas';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
  loginMutation: {
    mutateAsync: (data: { email: string; password: string }) => Promise<unknown>;
    isPending: boolean;
  };
}

// Google SVG
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// GitHub SVG
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

// Shared input wrapper style
const inputWrapStyle: React.CSSProperties = {
  position: 'relative',
  marginBottom: 12,
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-placeholder)',
  pointerEvents: 'none',
  transition: 'color 150ms',
};

export function LoginForm({ onSuccess, onSwitchToSignup, loginMutation }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await loginMutation.mutateAsync({ email: values.email, password: values.password });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Incorrect email or password.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div style={inputWrapStyle}>
          <span style={iconStyle}><Mail size={16} /></span>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="Email address"
            className="input-field"
          />
          {errors.email && (
            <p style={{ fontSize: '0.75rem', color: 'var(--status-error)', marginTop: 4 }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div style={{ ...inputWrapStyle, marginBottom: 0 }}>
          <span style={iconStyle}><Lock size={16} /></span>
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password (min. 8 characters)"
            className="input-field"
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-placeholder)',
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          {errors.password && (
            <p style={{ fontSize: '0.75rem', color: 'var(--status-error)', marginTop: 4 }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 10,
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)',
              padding: '8px 12px',
              fontSize: '0.83rem',
              color: 'var(--status-error)',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* CTA button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="btn-primary"
          style={{ marginTop: 18 }}
        >
          {loginMutation.isPending ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={16} style={{ animation: 'connecting-spin 0.8s linear infinite' }} />
              Connecting…
            </span>
          ) : (
            'Sign In & Connect'
          )}
        </button>
      </form>

      {/* OR divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.68rem',
          color: 'var(--text-ghost)',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}>
          OR CONTINUE WITH
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
      </div>

      {/* OAuth row */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { Icon: GoogleIcon, label: 'Google' },
          { Icon: GitHubIcon, label: 'GitHub' },
        ].map(({ Icon, label }) => (
          <motion.button
            key={label}
            type="button"
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 42,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.83rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 150ms, background 150ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-active)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            }}
          >
            <Icon />
            {label}
          </motion.button>
        ))}
      </div>

      {/* Switch mode */}
      <p style={{
        marginTop: 20,
        textAlign: 'center',
        fontSize: '0.83rem',
        color: 'var(--text-muted)',
      }}>
        Don&apos;t have an account?{' '}
        <button
          onClick={onSwitchToSignup}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--accent-indigo)',
            fontWeight: 500,
            fontSize: '0.83rem',
            fontFamily: 'Inter, sans-serif',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget).style.color = 'var(--accent-violet)'; }}
          onMouseLeave={e => { (e.currentTarget).style.color = 'var(--accent-indigo)'; }}
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
