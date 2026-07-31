import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy /auth/* to backend EXCEPT /auth/callback (handled by React Router)
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // /auth/callback is the React page that receives the JWT from the backend.
          // Do NOT proxy it — let Vite serve index.html so React Router takes over.
          if (req.url?.startsWith('/auth/callback')) {
            return '/index.html';
          }
          // Everything else (/auth/google, /auth/github, /auth/google/callback, etc.)
          // goes to the FastAPI backend.
          return null;
        },
      },
    },
  },
});
