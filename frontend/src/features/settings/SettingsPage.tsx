import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Headphones, Brain, Shield, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { toast } from '../../lib/toast';

type Tab = 'profile' | 'audio' | 'agent' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile',  icon: <User size={15} /> },
  { id: 'audio',   label: 'Audio',    icon: <Headphones size={15} /> },
  { id: 'agent',   label: 'Agent',    icon: <Brain size={15} /> },
  { id: 'account', label: 'Account',  icon: <Shield size={15} /> },
];

const VOICES = [
  { id: 'aria',  label: 'Aria',  sub: 'Warm · Conversational' },
  { id: 'nova',  label: 'Nova',  sub: 'Clear · Professional'  },
  { id: 'echo',  label: 'Echo',  sub: 'Deep · Authoritative'  },
  { id: 'sage',  label: 'Sage',  sub: 'Calm · Thoughtful'     },
  { id: 'orion', label: 'Orion', sub: 'Crisp · Energetic'     },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.85rem',
      fontWeight: 500,
      color: 'var(--text-secondary)',
      display: 'block',
      marginBottom: '8px',
    }}>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      margin: '0 0 20px',
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.95rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
      paddingBottom: '12px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {children}
    </h3>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────────
function ProfileTab() {
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  function handleSave() {
    setSaved(true);
    toast.success('Profile settings saved');
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px' }}>
      <SectionTitle>Profile</SectionTitle>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1.4rem',
            fontWeight: 600,
            color: '#fff',
          }}>
            {initials}
          </span>
        </div>
        <div>
          <p style={{
            margin: '0 0 4px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.88rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}>
            {user?.name}
          </p>
          <p style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}>
            {user?.email}
          </p>
        </div>
      </div>

      {/* Name input */}
      <div>
        <Label>Full Name</Label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '16px' }}
          placeholder="Your display name"
          aria-label="Full name"
        />
      </div>

      {/* Email — read only */}
      <div>
        <Label>Email Address</Label>
        <input
          type="email"
          value={user?.email || ''}
          readOnly
          className="input-field"
          style={{ paddingLeft: '16px', opacity: 0.55, cursor: 'not-allowed' }}
          aria-label="Email address (read-only)"
        />
        <p style={{
          margin: '4px 0 0',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          color: 'var(--text-ghost)',
        }}>
          Cannot be changed
        </p>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="btn-primary"
        style={{ padding: '12px 28px', alignSelf: 'flex-start' }}
        aria-label="Save profile changes"
      >
        {saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> Saved!
          </span>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  );
}

// ── Audio tab ──────────────────────────────────────────────────────────────────
function AudioTab() {
  const { selectedVoiceId, setVoiceId } = useSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px' }}>
      <SectionTitle>Audio Settings</SectionTitle>

      <div>
        <Label>Agent Voice</Label>
        <p style={{
          margin: '0 0 12px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          Cartesia voice used for the AI assistant.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoiceId(v.id)}
              aria-pressed={selectedVoiceId === v.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: selectedVoiceId === v.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selectedVoiceId === v.id ? 'rgba(99,102,241,0.35)' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms',
              }}
            >
              <div>
                <p style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: selectedVoiceId === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {v.label}
                </p>
                <p style={{
                  margin: '2px 0 0',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  color: 'var(--text-ghost)',
                }}>
                  {v.sub}
                </p>
              </div>
              {selectedVoiceId === v.id && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent-indigo)',
                  boxShadow: '0 0 8px var(--accent-indigo)',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 16px',
        background: 'rgba(6,9,18,0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
      }}>
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
        }}>
          Microphone and speaker device selection is managed by your browser. Use your system preferences to change default devices.
        </p>
      </div>
    </div>
  );
}

// ── Agent tab ──────────────────────────────────────────────────────────────────
function AgentTab() {
  const { devMode, toggleDevMode } = useSettingsStore();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [responseStyle, setResponseStyle] = useState(0.5);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    toast.success('Agent settings saved');
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px' }}>
      <SectionTitle>Agent Configuration</SectionTitle>

      <div>
        <Label>System Prompt Override</Label>
        <p style={{
          margin: '0 0 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          Customize the agent&apos;s behaviour. Leave blank to use the default.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful voice assistant…"
          aria-label="System prompt override"
          rows={4}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px 16px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            lineHeight: 1.55,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        />
      </div>

      <div>
        <Label>Response Style</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '56px' }}>
            Concise
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={responseStyle}
            onChange={(e) => setResponseStyle(Number(e.target.value))}
            aria-label="Response style from concise to detailed"
            style={{ flex: 1, accentColor: 'var(--accent-indigo)' }}
          />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '52px', textAlign: 'right' }}>
            Detailed
          </span>
        </div>
      </div>

      {/* Dev mode toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'rgba(6,9,18,0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
      }}>
        <div>
          <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Developer Mode
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Shows latency metrics and debug panels
          </p>
        </div>
        <button
          onClick={toggleDevMode}
          role="switch"
          aria-checked={devMode}
          aria-label={`Developer mode ${devMode ? 'on' : 'off'}`}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            background: devMode ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 200ms',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '3px',
            left: devMode ? '22px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 200ms',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }} />
        </button>
      </div>

      <button
        onClick={handleSave}
        className="btn-primary"
        style={{ padding: '12px 28px', alignSelf: 'flex-start' }}
        aria-label="Save agent settings"
      >
        {saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> Saved!
          </span>
        ) : (
          'Save Agent Settings'
        )}
      </button>
    </div>
  );
}

// ── Account tab ────────────────────────────────────────────────────────────────
function AccountTab() {
  const logout = useAppStore((s) => s.logout);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const user = useAppStore((s) => s.user);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '480px' }}>
      <SectionTitle>Account</SectionTitle>

      {/* Logout */}
      <div>
        <Label>Sign Out</Label>
        <button
          onClick={logout}
          className="btn-secondary"
          style={{ padding: '10px 20px' }}
          aria-label="Sign out of your account"
        >
          Sign Out
        </button>
      </div>

      {/* Danger zone */}
      <div style={{
        border: '1px solid rgba(239,68,68,0.22)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
      }}>
        <h4 style={{
          margin: '0 0 8px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--status-error)',
        }}>
          Danger Zone
        </h4>
        <p style={{
          margin: '0 0 16px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
        }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px',
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.28)',
              borderRadius: '8px',
              color: 'var(--status-error)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
            aria-label="Delete my account"
          >
            Delete My Account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}>
              Type your email to confirm: <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field"
              style={{ paddingLeft: '16px' }}
              aria-label="Confirm email for account deletion"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={deleteEmail !== user?.email}
                onClick={logout}
                style={{
                  padding: '9px 16px',
                  background: deleteEmail === user?.email ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  color: deleteEmail === user?.email ? 'var(--status-error)' : 'var(--text-ghost)',
                  cursor: deleteEmail === user?.email ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
                aria-label="Confirm account deletion"
              >
                Delete Forever
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); }}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings page ─────────────────────────────────────────────────────────
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    audio:   <AudioTab />,
    agent:   <AgentTab />,
    account: <AccountTab />,
  };

  return (
    <div style={{
      padding: '40px 48px',
      maxWidth: '720px',
      height: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'none',
    }}>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        style={{
          margin: '0 0 28px',
          fontFamily: "'Inter', sans-serif",
          fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
        }}
      >
        Settings
      </motion.h1>

      {/* Tab bar */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '32px',
          gap: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-indigo)' : 'transparent'}`,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              fontWeight: 500,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 150ms',
              marginBottom: '-1px',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderBottomColor = 'var(--border-default)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderBottomColor = 'transparent';
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
