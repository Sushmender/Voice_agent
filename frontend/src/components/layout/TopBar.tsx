import { Keyboard, Zap } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface TopBarProps {
  onShortcutsOpen?: () => void;
}

export function TopBar({ onShortcutsOpen }: TopBarProps) {
  const user = useAppStore((s) => s.user);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-surface/80 backdrop-blur-sm flex-shrink-0">
      {/* Left: logo mark */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-accent-indigo" />
        <span className="text-sm font-semibold text-gradient">VoiceOps AI</span>
      </div>

      {/* Right: shortcuts + avatar */}
      <div className="flex items-center gap-3">
        {onShortcutsOpen && (
          <button
            id="topbar-shortcuts-btn"
            onClick={onShortcutsOpen}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-border-bright hover:text-text-primary transition-colors"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        )}

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-xs font-bold text-white shadow-glow-sm"
          title={user?.name}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
