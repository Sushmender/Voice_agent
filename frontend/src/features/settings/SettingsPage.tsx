import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Headphones, Brain, Shield, Check, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useUpdateNameMutation } from '../auth/hooks/useAuth';
import { toast, toasts } from '../../lib/toast';
import api from '../../lib/axios';

type Tab = 'profile' | 'audio' | 'agent' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile',  icon: <User size={15} /> },
  { id: 'audio',   label: 'Audio',    icon: <Headphones size={15} /> },
  { id: 'agent',   label: 'Agent',    icon: <Brain size={15} /> },
  { id: 'account', label: 'Account',  icon: <Shield size={15} /> },
];

const VOICES = [
  { id: 'skylar',   label: 'Skylar',   sub: 'Warm · Conversational' },
  { id: 'rachel',   label: 'Rachel',   sub: 'Clear · Professional'  },
  { id: 'lauren',   label: 'Lauren',   sub: 'Bright · Friendly'     },
  { id: 'caroline', label: 'Caroline', sub: 'Calm · Thoughtful'     },
  { id: 'morgan',   label: 'Morgan',   sub: 'Deep · Authoritative'  },
  { id: 'daniel',   label: 'Daniel',   sub: 'Crisp · Energetic'     },
];

// UUID → voice name reverse-lookup (mirrors backend VOICE_ID_TO_NAME)
const UUID_TO_VOICE_NAME: Record<string, string> = {
  'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4': 'skylar',
  '10bd4af4-825b-49b8-b8bd-0ca11865536e': 'rachel',
  'a33f7a4c-100f-41cf-a1fd-5822e8fc253f': 'lauren',
  'f9836c6e-a0bd-460e-9d3c-f7299fa60f94': 'caroline',
  '0ee8beaa-db49-4024-940d-c7ea09b590b3': 'morgan',
  '47c38ca4-5f35-497b-b1a3-415245fb35e1': 'daniel',
};

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
  const updateNameMutation = useUpdateNameMutation();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  async function handleSave() {
    if (!name.trim()) return;
    try {
      await updateNameMutation.mutateAsync(name.trim());
      setSaved(true);
      toast.success('Profile settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled by the mutation hook's toast
    }
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
        disabled={updateNameMutation.isPending || !name.trim()}
        className="btn-primary"
        style={{ padding: '12px 28px', alignSelf: 'flex-start' }}
        aria-label="Save profile changes"
      >
        {saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> Saved!
          </span>
        ) : updateNameMutation.isPending ? (
          'Saving...'
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  );
}

// ── Audio tab ──────────────────────────────────────────────────────────────────
function AudioTab() {
  const user = useAppStore((s) => s.user);
  const { selectedVoiceId, setVoiceId } = useSettingsStore();
  const [saving, setSaving] = useState(false);

  // On mount: sync the UI selection from the DB voice_id UUID so it reflects
  // whatever is actually stored, even if localStorage is stale or was cleared.
  useEffect(() => {
    if (user?.voice_id) {
      const name = UUID_TO_VOICE_NAME[user.voice_id];
      if (name && name !== selectedVoiceId) {
        setVoiceId(name);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.voice_id]);

  async function handleVoiceSelect(voiceId: string) {
    if (voiceId === selectedVoiceId || saving) return;

    const previous = selectedVoiceId;
    // Optimistic update — move highlight immediately
    setVoiceId(voiceId);
    setSaving(true);

    try {
      await api.put('/auth/voice', { voice_name: voiceId });
      const label = VOICES.find((v) => v.id === voiceId)?.label ?? voiceId;
      toasts.voiceChanged(label);
    } catch {
      // Rollback on failure
      setVoiceId(previous);
      toasts.error('Failed to update voice. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
          Choose the voice for your AI assistant. Changes take effect on your next session.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => handleVoiceSelect(v.id)}
              aria-pressed={selectedVoiceId === v.id}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: selectedVoiceId === v.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selectedVoiceId === v.id ? 'rgba(99,102,241,0.35)' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 150ms',
                opacity: saving && selectedVoiceId !== v.id ? 0.6 : 1,
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
                  background: saving ? 'var(--text-muted)' : 'var(--accent-indigo)',
                  boxShadow: saving ? 'none' : '0 0 8px var(--accent-indigo)',
                  transition: 'background 200ms, box-shadow 200ms',
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
const MAX_PROMPT_CHARS = 500;

const STYLE_LABELS: { max: number; label: string; color: string }[] = [
  { max: 0.15, label: 'Ultra-Concise',   color: '#6366f1' },
  { max: 0.35, label: 'Concise',         color: '#818cf8' },
  { max: 0.65, label: 'Balanced',        color: '#a3e635' },
  { max: 0.75, label: 'Conversational',  color: '#fb923c' },
  { max: 1.01, label: 'Detailed',        color: '#f43f5e' },
];

function getStyleMeta(val: number) {
  return STYLE_LABELS.find((s) => val <= s.max) ?? STYLE_LABELS[STYLE_LABELS.length - 1];
}

function AgentTab() {
  const { devMode, toggleDevMode, systemPromptOverride, responseStyle, setSystemPromptOverride, setResponseStyle } =
    useSettingsStore();

  const [localPrompt, setLocalPrompt] = useState(systemPromptOverride);
  const [localStyle, setLocalStyle] = useState(responseStyle);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from backend on mount (in case user is on a new device)
  useEffect(() => {
    api.get('/auth/agent-settings')
      .then((res) => {
        const { system_prompt_override, response_style } = res.data;
        setLocalPrompt(system_prompt_override ?? '');
        setLocalStyle(response_style ?? 0.5);
        setSystemPromptOverride(system_prompt_override ?? '');
        setResponseStyle(response_style ?? 0.5);
      })
      .catch(() => {
        // fall back to locally cached values
        setLocalPrompt(systemPromptOverride);
        setLocalStyle(responseStyle);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    // Enforce 500-char limit client-side too
    const prompt = localPrompt.trim().slice(0, MAX_PROMPT_CHARS);
    const style  = Math.min(1, Math.max(0, localStyle));

    setSaving(true);
    try {
      await api.put('/auth/agent-settings', {
        system_prompt_override: prompt,
        response_style: style,
      });
      setSystemPromptOverride(prompt);
      setResponseStyle(style);
      setSaved(true);
      toast.success('Agent settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to save agent settings');
    } finally {
      setSaving(false);
    }
  }

  const styleMeta = getStyleMeta(localStyle);
  const charCount = localPrompt.length;
  const charOver  = charCount > MAX_PROMPT_CHARS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px' }}>
      <SectionTitle>Agent Configuration</SectionTitle>

      {/* ── System Prompt Override ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <Label>System Prompt Override</Label>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: charOver ? 'var(--status-error)' : charCount > MAX_PROMPT_CHARS * 0.85 ? '#fb923c' : 'var(--text-ghost)',
            transition: 'color 150ms',
          }}>
            {charCount}/{MAX_PROMPT_CHARS}
          </span>
        </div>
        <p style={{
          margin: '0 0 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Custom instructions <strong style={{ color: 'var(--text-secondary)' }}>appended</strong> to the base prompt.
          Leave blank to use the default behaviour.
        </p>
        <textarea
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder="e.g. You are a cooking expert. Always relate answers to food when possible."
          aria-label="System prompt override"
          disabled={loading}
          rows={4}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px 16px',
            background: 'var(--bg-input)',
            border: `1px solid ${charOver ? 'var(--status-error)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            lineHeight: 1.55,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms',
            opacity: loading ? 0.5 : 1,
          }}
          onFocus={(e) => !charOver && (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => !charOver && (e.currentTarget.style.borderColor = 'var(--border-default)')}
        />
        {charOver && (
          <p style={{ margin: '4px 0 0', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--status-error)' }}>
            Exceeds {MAX_PROMPT_CHARS}-character limit — extra text will be trimmed on save.
          </p>
        )}
      </div>

      {/* ── Response Style slider ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Label>Response Style</Label>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem',
            fontWeight: 600,
            color: styleMeta.color,
            padding: '2px 8px',
            background: `${styleMeta.color}18`,
            border: `1px solid ${styleMeta.color}40`,
            borderRadius: '6px',
            transition: 'all 200ms',
          }}>
            {styleMeta.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '56px' }}>
            Concise
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={localStyle}
            onChange={(e) => setLocalStyle(Number(e.target.value))}
            aria-label="Response style: concise to detailed"
            disabled={loading}
            style={{ flex: 1, accentColor: styleMeta.color, transition: 'accent-color 200ms' }}
          />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '52px', textAlign: 'right' }}>
            Detailed
          </span>
        </div>
        <p style={{ margin: '8px 0 0', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'var(--text-ghost)', lineHeight: 1.45 }}>
          {localStyle <= 0.2 && 'Agent answers in one sentence only.'}
          {localStyle > 0.2 && localStyle <= 0.4 && 'Agent keeps answers to 1–2 sentences.'}
          {localStyle > 0.4 && localStyle <= 0.6 && 'Default: 1–3 sentences, natural voice pacing.'}
          {localStyle > 0.6 && localStyle <= 0.7 && 'Agent can give 3–4 sentences when helpful.'}
          {localStyle > 0.7 && 'Agent provides comprehensive, in-depth answers.'}
        </p>
      </div>

      {/* ── Next-session notice ── */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 14px',
        background: 'rgba(99,102,241,0.07)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '10px',
      }}>
        <Info size={14} style={{ color: 'var(--accent-indigo)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Changes apply to your <strong style={{ color: 'var(--text-secondary)' }}>next session</strong>. The current active session will not be affected.
        </p>
      </div>

      {/* ── Dev mode toggle ── */}
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
        disabled={saving || loading}
        className="btn-primary"
        style={{ padding: '12px 28px', alignSelf: 'flex-start', opacity: (saving || loading) ? 0.6 : 1 }}
        aria-label="Save agent settings"
      >
        {saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> Saved!
          </span>
        ) : saving ? 'Saving…' : 'Save Agent Settings'}
      </button>
    </div>
  );
}

// ── Account tab ────────────────────────────────────────────────────────────────
function AccountTab() {
  const logout = useAppStore((s) => s.logout);
  const resetSession = useSessionStore((s) => s.resetSession);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const user = useAppStore((s) => s.user);

  const handleLogout = () => {
    resetSession(); // clear transcripts & tool events for the next user
    logout();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '480px' }}>
      <SectionTitle>Account</SectionTitle>

      {/* Logout */}
      <div>
        <Label>Sign Out</Label>
        <button
          onClick={handleLogout}
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
                onClick={handleLogout}
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
