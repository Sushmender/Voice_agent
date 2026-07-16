import { useEffect, useCallback } from 'react';

interface ShortcutOptions {
  onConnect: () => void;
  onDisconnect: () => void;
  onMuteToggle: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  isConnected: boolean;
  isIdle: boolean;
}

export function useKeyboardShortcuts({
  onConnect,
  onDisconnect,
  onMuteToggle,
  onOpenSettings,
  onOpenShortcuts,
  isConnected,
  isIdle,
}: ShortcutOptions) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (meta && e.key === 'Enter') {
        e.preventDefault();
        if (isIdle) onConnect();
        else if (isConnected) onDisconnect();
      }

      if (meta && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        if (isConnected) onMuteToggle();
      }

      if (meta && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
      }

      if (e.key === '?' && !meta) {
        onOpenShortcuts?.();
      }

      if (e.key === 'Escape') {
        // let parent handle modal close
      }
    },
    [onConnect, onDisconnect, onMuteToggle, onOpenSettings, onOpenShortcuts, isConnected, isIdle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}
