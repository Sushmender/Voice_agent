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
      },
      colors: {
        bg: {
          DEFAULT: '#0a0b0f',
          deep: '#060709',
        },
        surface: {
          DEFAULT: '#111218',
          raised: '#161820',
          overlay: '#1c1e28',
        },
        border: {
          DEFAULT: '#1e2030',
          subtle: '#161825',
          bright: '#2d3050',
        },
        accent: {
          indigo: '#6366f1',
          violet: '#8b5cf6',
          cyan: '#22d3ee',
          emerald: '#10b981',
        },
        text: {
          primary: '#f1f2f7',
          secondary: '#a0a3b8',
          muted: '#5c6080',
        },
        status: {
          idle: '#4b5563',
          connecting: '#f59e0b',
          connected: '#10b981',
          listening: '#6366f1',
          thinking: '#22d3ee',
          speaking: '#8b5cf6',
          error: '#ef4444',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.25)',
        'glow-sm': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-violet': '0 0 40px rgba(139, 92, 246, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
