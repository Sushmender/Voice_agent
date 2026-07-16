import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { queryClient } from './lib/queryClient';
import { useAppStore } from './store/useAppStore';
import { AuthPage } from './features/auth/AuthPage';
import { ConsolePage } from './features/console/ConsolePage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// ── Page transition wrapper ───────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 14 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -10 },
};

const pageTransition = {
  in:  { duration: 0.35, ease: [0, 0, 0.2, 1] as [number,number,number,number] },
  out: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number,number,number,number] },
};

// ── Stub pages for routes added in Day 3 ─────────────────────────────────────
function StubPage({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '12px', color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: '2rem' }}>🚧</span>
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}>{title} — Coming in Day 3</p>
    </div>
  );
}

// ── App shell (authenticated layout) ─────────────────────────────────────────
function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition.in}
              style={{ height: '100%' }}
            >
              <Routes location={location}>
                <Route path="/console"   element={<ConsolePage />} />
                <Route path="/dashboard" element={<StubPage title="Dashboard" />} />
                <Route path="/history"   element={<StubPage title="Session History" />} />
                <Route path="/settings"  element={<StubPage title="Settings" />} />
                <Route path="*"          element={<Navigate to="/console" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ── Root redirect ─────────────────────────────────────────────────────────────
function RootRedirect() {
  const token = useAppStore((s) => s.token);
  return <Navigate to={token ? '/console' : '/login'} replace />;
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/"      element={<RootRedirect />} />
            <Route path="/login" element={<AuthPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>

      {/* Global toasts */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(13,16,24,0.95)',
            border: '1px solid rgba(99,102,241,0.18)',
            color: '#f0f4ff',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
