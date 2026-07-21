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
import { DashboardPage } from './features/dashboard/DashboardPage';
import { HistoryPage } from './features/history/HistoryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// ── Page transition variants ──────────────────────────────────────────────────
// Default: fade-up enter, fade-up-exit
const pageVariants = {
  initial: { opacity: 0, y: 14 },
  in:      { opacity: 1, y: 0  },
  out:     { opacity: 0, y: -10 },
};

// Per-route overrides (DESIGN_REFERENCE §13)
function getRouteVariants(pathname: string) {
  if (pathname === '/console') {
    // /dashboard → /room: scale-bounce
    return {
      initial: { opacity: 0, scale: 0.97 },
      in:      { opacity: 1, scale: 1     },
      out:     { opacity: 0, scale: 1.02  },
    };
  }
  if (pathname === '/history' || pathname === '/settings') {
    // slide-left: enters from right
    return {
      initial: { opacity: 0, x: 28 },
      in:      { opacity: 1, x: 0  },
      out:     { opacity: 0, x: -16 },
    };
  }
  return pageVariants; // default fade-up
}

function getRouteTransition(pathname: string) {
  if (pathname === '/console') {
    return { in: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] as [number,number,number,number] },
             out: { duration: 0.25, ease: [0.4, 0, 1, 1] as [number,number,number,number] } };
  }
  if (pathname === '/history' || pathname === '/settings') {
    return { in:  { duration: 0.30, ease: [0, 0, 0.2, 1] as [number,number,number,number] },
             out: { duration: 0.20, ease: [0.4, 0, 1, 1] as [number,number,number,number] } };
  }
  return {
    in:  { duration: 0.35, ease: [0, 0, 0.2, 1] as [number,number,number,number] },
    out: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number,number,number,number] },
  };
}

// ── App shell (authenticated layout) ─────────────────────────────────────────
function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const location = useLocation();

  const variants = getRouteVariants(location.pathname);
  const transition = getRouteTransition(location.pathname);

  // Console page handles its own full layout (no top bar overlap)
  const isConsole = location.pathname === '/console';

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* TopBar only shown outside console (console has its own) */}
        {!isConsole && <TopBar />}

        <main
          className="flex-1 overflow-hidden"
          role="main"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={variants}
              transition={transition.in}
              style={{ height: '100%' }}
            >
              <Routes location={location}>
                <Route path="/console"   element={<ConsolePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/history"   element={<HistoryPage />} />
                <Route path="/settings"  element={<SettingsPage />} />
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
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
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
