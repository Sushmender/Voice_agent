import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { SessionsSidebar } from './components/SessionsSidebar';
import { PanelSkeleton } from '../../components/shared/LoadingSkeleton';

const VOICE_OPTIONS = [
  { id: 'aria', label: 'Aria' },
  { id: 'nova', label: 'Nova' },
  { id: 'echo', label: 'Echo' },
  { id: 'sage', label: 'Sage' },
  { id: 'orion', label: 'Orion' },
];

export function ConsolePage() {
  const [activeSessionId, setActiveSessionId] = React.useState<string | undefined>();
  const [selectedVoice, setSelectedVoice] = React.useState('aria');
  const [sessionKey, setSessionKey] = React.useState(0);

  const handleNewSession = () => {
    setActiveSessionId(undefined);
    setSessionKey((k) => k + 1);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sessions sidebar */}
      <SessionsSidebar
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={handleNewSession}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Console top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-text-primary">Voice Console</h1>
            {activeSessionId && (
              <span className="badge bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/20">
                Session active
              </span>
            )}
          </div>

          {/* Voice selector */}
          <div className="relative">
            <label className="text-xs text-text-muted mr-2">Voice:</label>
            <div className="relative inline-block">
              <select
                id="voice-selector"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="appearance-none bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary pr-7 outline-none focus:border-accent-indigo cursor-pointer hover:border-border-bright transition-colors"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Main 2-panel content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center — Orb + controls (Day 2) */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
            <motion.div
              key={sessionKey}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-6 w-full max-w-md"
            >
              {/* Orb placeholder */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-64 h-64 rounded-full bg-accent-indigo/5 blur-3xl animate-pulse-slow" />
                <div className="relative w-48 h-48 rounded-full border border-border bg-surface-raised flex items-center justify-center shadow-card">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-surface-overlay to-surface-raised border border-border-bright mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-7 h-7 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 16.93V21h-2v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
                      </svg>
                    </div>
                    <p className="text-xs text-text-muted">Orb Visualizer</p>
                    <p className="text-xs text-text-muted opacity-50">(Day 2)</p>
                  </div>
                </div>
              </div>

              {/* Status badge placeholder */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-raised">
                <div className="status-dot bg-status-idle animate-pulse" />
                <span className="text-xs text-text-muted font-medium">IDLE</span>
              </div>

              {/* Control bar placeholder */}
              <div className="w-full flex items-center justify-center gap-4">
                <button
                  id="connect-btn"
                  className="btn-primary w-auto px-8"
                  disabled
                >
                  Connect (Day 2)
                </button>
              </div>

              <p className="text-xs text-text-muted text-center max-w-xs opacity-70">
                Voice controls and transcript will be available in Day 2. Auth and routing are fully functional.
              </p>
            </motion.div>
          </div>

          {/* Right panel — Transcript (Day 2) */}
          <div className="w-80 border-l border-border bg-surface/30 flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Transcript</h2>
            </div>
            <div className="flex-1 p-4">
              <PanelSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
