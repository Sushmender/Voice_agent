import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { useAppStore } from './store/useAppStore';
import { AuthPage } from './features/auth/AuthPage';
import { ConsolePage } from './features/console/ConsolePage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/console" element={<ConsolePage />} />
            {/* More protected routes (history, settings) added in Day 3 */}
            <Route path="*" element={<Navigate to="/console" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function RootRedirect() {
  const token = useAppStore((s) => s.token);
  return <Navigate to={token ? '/console' : '/login'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
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

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#161820',
            border: '1px solid #1e2030',
            color: '#f1f2f7',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
