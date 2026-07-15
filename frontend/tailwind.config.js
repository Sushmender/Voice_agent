/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        /* Backgrounds */
        'bg-base':     '#080b12',
        'bg-surface':  '#0d1018',
        'bg-elevated': '#161b27',
        'bg-input':    '#060912',

        /* Legacy aliases still used in existing components */
        bg:      { DEFAULT: '#080b12', deep: '#060912' },
        surface: { DEFAULT: '#0d1018', raised: '#161b27', overlay: '#1c1e28' },
        border:  { DEFAULT: 'rgba(99,102,241,0.18)', subtle: 'rgba(99,102,241,0.10)', bright: 'rgba(99,102,241,0.40)' },

        /* Brand accents */
        accent: {
          blue:    '#3b82f6',
          indigo:  '#6366f1',
          violet:  '#a855f7',
          cyan:    '#22d3ee',
          emerald: '#10b981',
        },

        /* Text */
        text: {
          primary:   '#f0f4ff',
          secondary: '#e2e8f0',
          muted:     '#7a8aa0',
          ghost:     '#2d3748',
        },

        /* Status */
        status: {
          idle:       '#4a5568',
          connecting: '#f59e0b',
          connected:  '#22c55e',
          listening:  '#3b82f6',
          speaking:   '#6366f1',
          error:      '#ef4444',
        },
      },

      boxShadow: {
        card:           '0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset',
        'glow-blue':    '0 0 40px rgba(59,130,246,0.25)',
        'glow-indigo':  '0 0 40px rgba(99,102,241,0.3)',
        'glow-violet':  '0 0 40px rgba(168,85,247,0.25)',
        'orb-active':   '0 0 80px rgba(99,102,241,0.5), 0 0 160px rgba(59,130,246,0.2)',
        'focus-ring':   '0 0 0 3px rgba(99,102,241,0.18), 0 0 24px rgba(99,102,241,0.1)',
        /* Legacy */
        glow:    '0 0 40px rgba(99, 102, 241, 0.25)',
        'glow-sm': '0 0 20px rgba(99, 102, 241, 0.15)',
      },

      borderRadius: {
        'sm':   '8px',
        'md':   '12px',
        'lg':   '16px',
        'xl':   '20px',
        '2xl':  '24px',
        'pill': '100px',
      },

      animation: {
        /* Orb */
        'orb-spin':    'orb-spin 18s linear infinite',
        'orb-spin-ccw':'orb-spin-ccw 12s linear infinite',
        'orb-pulse':   'orb-pulse 3s ease-in-out infinite',
        'orb-breathe': 'orb-breathe 2.5s ease-in-out infinite',
        /* Bars */
        'bar-bounce':  'bar-bounce 0.75s ease-in-out infinite',
        /* Background */
        'nebula-shift':'nebula-shift 9s ease-in-out infinite',
        /* Text */
        'shimmer-text':'shimmer-text 4s linear infinite',
        /* Status */
        'status-pulse':'status-pulse 1s ease-in-out infinite',
        /* Connector */
        'connector-flow': 'connector-flow 2s ease-in-out infinite',
        /* Legacy */
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'fade-in':     'fade-up 0.3s ease-out',
        'shimmer':     'shimmer 1.5s infinite',
      },

      keyframes: {
        'orb-spin':     { to: { transform: 'rotate(360deg)' } },
        'orb-spin-ccw': { to: { transform: 'rotate(-360deg)' } },
        'orb-pulse': {
          '0%,100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%':     { transform: 'scale(1.06)', opacity: '0.9' },
        },
        'orb-breathe': {
          '0%,100%': { transform: 'scale(1)' },
          '50%':     { transform: 'scale(1.035)' },
        },
        'bar-bounce': {
          '0%,100%': { transform: 'scaleY(0.18)' },
          '50%':     { transform: 'scaleY(1)' },
        },
        'nebula-shift': {
          '0%,100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':     { opacity: '0.65', transform: 'scale(1.05)' },
        },
        'shimmer-text': {
          from: { backgroundPosition: '-200% center' },
          to:   { backgroundPosition: '200% center' },
        },
        'status-pulse': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
        'connector-flow': {
          '0%':   { strokeDashoffset: '40', opacity: '0.3' },
          '50%':  { opacity: '1' },
          '100%': { strokeDashoffset: '0', opacity: '0.3' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },

      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
