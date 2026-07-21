import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, Clock, Keyboard, Settings, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SessionsSidebar } from './components/SessionsSidebar';
import { OrbVisualizer } from './components/OrbVisualizer';
import { AgentStatusBadge } from './components/AgentStatusBadge';
import { TranscriptPanel } from './components/TranscriptPanel';
import { ControlBar } from './components/ControlBar';
import { WarmupHint } from './components/WarmupHint';
import { WaveformStrip } from './components/WaveformStrip';
import { PipelineStrip } from './components/PipelineStrip';
import { ToolTimeline } from './components/ToolTimeline';
import { MemoryViewer } from './components/MemoryViewer';
import { LatencyPanel } from './components/LatencyPanel';
import { KeyboardShortcutsModal } from '../../components/shared/KeyboardShortcutsModal';
import { MicPermissionBanner } from '../../components/shared/MicPermissionBanner';
import { SettingsDrawer } from '../settings/components/SettingsDrawer';

import { useVoiceAgent } from './hooks/useVoiceAgent';
import { useWaveform } from './hooks/useWaveform';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSessionStore } from '../../store/useSessionStore';
import { useSettingsStore } from '../../store/useSettingsStore';

import type { RemoteTrack } from 'livekit-client';

// ── Timer formatting ──────────────────────────────────────────────────────────
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const VOICE_OPTIONS = [
  { id: 'aria',  label: 'Aria' },
  { id: 'nova',  label: 'Nova' },
  { id: 'echo',  label: 'Echo' },
  { id: 'sage',  label: 'Sage' },
  { id: 'orion', label: 'Orion' },
];

// ── Background layers (stars + nebulas) ───────────────────────────────────────
function BackgroundLayers({ agentState }: { agentState: string }) {
  const isSpeaking = agentState === 'CONNECTED';
  const isError    = agentState === 'ERROR';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Nebula A — turns red on error */}
      <div className="nebula" style={{
        width: '600px', height: '600px',
        top: '-20%', left: '-10%',
        '--nebula-color': isError ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
        '--nebula-dur': '12s',
        opacity: isError ? 0.5 : 1,
        transition: 'all 1s ease',
      } as React.CSSProperties} />
      {/* Nebula B */}
      <div className="nebula" style={{
        width: '500px', height: '500px',
        bottom: '-10%', right: '5%',
        '--nebula-color': 'rgba(99,102,241,0.07)',
        '--nebula-dur': '15s',
        '--nebula-delay': '4s',
        opacity: isError ? 0.5 : 1,
        transition: 'opacity 1s ease',
      } as React.CSSProperties} />
      {/* Nebula C — only when CONNECTED/SPEAKING (intensified) */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="nebula"
            style={{
              width: '400px', height: '400px',
              top: '30%', left: '20%',
              '--nebula-color': 'rgba(99,102,241,0.18)',
              '--nebula-dur': '4s',
            } as React.CSSProperties}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── State label ───────────────────────────────────────────────────────────────
function StateLabel({ agentState, speakingState }: { agentState: string; speakingState: string }) {
  const label = (() => {
    if (agentState === 'IDLE')        return 'Ready to connect';
    if (agentState === 'CONNECTING')  return 'Connecting…';
    if (agentState === 'WARMING_UP')  return 'Agent warming up…';
    if (agentState === 'ERROR')       return 'Connection error';
    if (speakingState === 'LISTENING') return 'Listening…';
    if (speakingState === 'SPEAKING')  return 'Speaking…';
    return 'Listening…';
  })();

  const color = (() => {
    if (agentState === 'CONNECTING' || agentState === 'WARMING_UP') return 'var(--status-connecting)';
    if (agentState === 'ERROR')  return 'var(--status-error)';
    if (speakingState === 'SPEAKING') return 'var(--status-speaking)';
    if (speakingState === 'LISTENING') return 'var(--status-listening)';
    if (agentState === 'CONNECTED') return 'var(--text-muted)';
    return 'var(--text-ghost)';
  })();

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.9rem',
          color,
          transition: 'color 0.3s ease',
        }}
      >
        {label}
      </motion.p>
    </AnimatePresence>
  );
}

// ── Right panel tab bar ────────────────────────────────────────────────────────
type RightTab = 'transcript' | 'tools' | 'latency';

// ── Main page ─────────────────────────────────────────────────────────────────
export function ConsolePage() {
  const navigate = useNavigate();
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [sessionKey, setSessionKey] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [micError, setMicError] = useState<'denied' | 'notfound' | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('transcript');

  const { selectedVoiceId, devMode, setVoiceId } = useSettingsStore();
  const {
    agentState, speakingState, sessionDuration, error,
    transcripts, toolEvents, latencyHistory, resetSession,
  } = useSessionStore();

  const { connect, disconnect, toggleMute, toggleVolume } = useVoiceAgent({
    roomName: `voice-room-${selectedVoiceId}`,
    onAudioTrack: (track) => setAudioTrack(track),
    onMicError: (type: 'denied' | 'notfound') => setMicError(type),
  });

  const waveform = useWaveform(audioTrack, { barCount: 20 });
  const orbWaveform = useWaveform(audioTrack, { barCount: 7 });

  const isIdle = agentState === 'IDLE' || agentState === 'ERROR';
  const isConnected = agentState === 'CONNECTED';

  // Waveform bars — only feed real data when active
  const activeBars = isConnected && (speakingState === 'SPEAKING' || speakingState === 'LISTENING')
    ? waveform.bars
    : Array(20).fill(0);

  const activeOrbBars = isConnected && (speakingState === 'SPEAKING' || speakingState === 'LISTENING')
    ? orbWaveform.bars
    : Array(7).fill(0);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onConnect: connect,
    onDisconnect: disconnect,
    onMuteToggle: toggleMute,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onOpenSettings: () => setSettingsOpen(true),
    isConnected,
    isIdle,
  });

  const handleNewSession = () => {
    setActiveSessionId(undefined);
    setSessionKey((k) => k + 1);
  };

  // Right panel tabs — show latency only in devMode
  const rightTabs: { id: RightTab; label: string }[] = [
    { id: 'transcript', label: 'TRANSCRIPT' },
    { id: 'tools',      label: 'TOOLS' },
    ...(devMode ? [{ id: 'latency' as RightTab, label: 'LATENCY' }] : []),
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <BackgroundLayers agentState={agentState} />

      {/* Sessions sidebar */}
      <SessionsSidebar
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={handleNewSession}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 10 }}>

        {/* ── Mic permission banner ────────────────────────────────────────── */}
        <AnimatePresence>
          {micError && (
            <MicPermissionBanner
              type={micError}
              onDismiss={() => setMicError(null)}
            />
          )}
        </AnimatePresence>

        {/* ── Top bar (56px sticky) ───────────────────────────────────────── */}
        <div style={{
          height: '56px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(8,11,18,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          gap: '16px',
        }}>
          {/* Left: back + session label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-icon-circle"
              aria-label="Go to Dashboard"
              style={{ width: '32px', height: '32px', flexShrink: 0 }}
            >
              <ChevronLeft size={16} color="var(--text-muted)" />
            </button>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeSessionId ? `Session #${activeSessionId.slice(-4)}` : 'New Session'}
            </span>
          </div>

          {/* Center: status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AgentStatusBadge agentState={agentState} speakingState={speakingState} />
          </div>

          {/* Right: timer + shortcuts + settings + voice selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Voice selector */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                id="voice-selector"
                value={selectedVoiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                aria-label="Select agent voice"
                style={{
                  appearance: 'none',
                  background: 'rgba(13,16,24,0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '5px 24px 5px 10px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" style={{ position: 'absolute', right: '7px', pointerEvents: 'none' }} />
            </div>

            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-icon-circle"
              aria-label="Open settings"
              title="Settings (⌘,)"
              style={{ width: '32px', height: '32px' }}
            >
              <Settings size={14} color="var(--text-muted)" />
            </button>

            {/* Keyboard shortcuts button */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="btn-icon-circle"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              style={{ width: '32px', height: '32px' }}
            >
              <Keyboard size={14} color="var(--text-muted)" />
            </button>

            {/* Session timer */}
            {agentState === 'CONNECTED' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                <Clock size={13} color="var(--text-muted)" />
                {formatDuration(sessionDuration)}
              </div>
            )}
          </div>
        </div>

        {/* ── Body: left stage + right panel ──────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LEFT STAGE (60%) */}
          <motion.div
            key={sessionKey}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              flex: '0.6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 48px',
              gap: '24px',
              position: 'relative',
            }}
          >
            {/* Error message */}
            <AnimatePresence>
              {agentState === 'ERROR' && error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.28)',
                    fontSize: '0.82rem',
                    color: '#fca5a5',
                    maxWidth: '340px',
                    textAlign: 'center',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orb */}
            <OrbVisualizer
              agentState={agentState}
              speakingState={speakingState}
              bars={activeOrbBars}
              amplitude={orbWaveform.amplitude}
            />

            {/* State label */}
            <StateLabel agentState={agentState} speakingState={speakingState} />

            {/* Waveform strip */}
            <WaveformStrip
              agentState={agentState}
              speakingState={speakingState}
              bars={activeBars}
            />

            {/* Pipeline strip */}
            <PipelineStrip agentState={agentState} speakingState={speakingState} />

            {/* Warmup hint */}
            <WarmupHint visible={agentState === 'WARMING_UP'} />

            {/* Control bar */}
            <ControlBar
              agentState={agentState}
              onConnect={connect}
              onDisconnect={disconnect}
              onToggleMute={toggleMute}
              onToggleVolume={toggleVolume}
            />

            {/* Memory viewer (collapsible, below controls) */}
            <div style={{ width: '100%', maxWidth: '340px', position: 'relative' }}>
              <MemoryViewer
                transcripts={transcripts}
                onClearSession={() => {
                  resetSession();
                  handleNewSession();
                }}
                isConnected={isConnected}
              />
            </div>

            {/* Keyboard hint — only in IDLE */}
            <AnimatePresence>
              {agentState === 'IDLE' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: 'var(--text-ghost)',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.04em',
                  }}
                >
                  Press ⌘ Enter to connect · ? for shortcuts
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* RIGHT PANEL (40%) */}
          <div
            role="region"
            aria-label="Session panels"
            style={{
              flex: '0.4',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'rgba(8,11,18,0.3)',
            }}
          >
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(8,11,18,0.5)',
              flexShrink: 0,
            }}>
              {rightTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  aria-selected={rightTab === tab.id}
                  role="tab"
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${rightTab === tab.id ? 'var(--accent-indigo)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: rightTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 150ms',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {tab.id === 'latency' && <Cpu size={11} />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={rightTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                {rightTab === 'transcript' && (
                  <TranscriptPanel speakingState={speakingState} />
                )}
                {rightTab === 'tools' && (
                  <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                    <ToolTimeline events={toolEvents} />
                  </div>
                )}
                {rightTab === 'latency' && devMode && (
                  <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                    <LatencyPanel entries={latencyHistory} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Settings drawer */}
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
