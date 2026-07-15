import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { useGetSessions } from '../../auth/hooks/useAuth';
import { LoadingSkeleton } from '../../../components/shared/LoadingSkeleton';
import type { Session } from '../../../types/auth';

interface SessionsSidebarProps {
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

function groupSessionsByDate(sessions: Session[]) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const groups: { label: string; sessions: Session[] }[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Earlier', sessions: [] },
  ];

  for (const session of sessions) {
    if (session.date === today) groups[0].sessions.push(session);
    else if (session.date === yesterday) groups[1].sessions.push(session);
    else groups[2].sessions.push(session);
  }

  return groups.filter((g) => g.sessions.length > 0);
}

export function SessionsSidebar({
  activeSessionId,
  onSessionSelect,
  onNewSession,
}: SessionsSidebarProps) {
  const { data, isLoading } = useGetSessions();
  const sessions = data?.sessions ?? [];
  const groups = groupSessionsByDate(sessions);

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <span className="text-sm font-semibold text-text-primary">Recent Sessions</span>
        <motion.button
          id="new-session-btn"
          onClick={onNewSession}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1 rounded-lg bg-accent-indigo/10 border border-accent-indigo/30 px-2.5 py-1.5 text-xs font-medium text-accent-indigo hover:bg-accent-indigo/20 transition-colors"
          aria-label="New session"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </motion.button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-2">
            <LoadingSkeleton rows={4} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <MessageSquare className="w-8 h-8 text-text-muted mb-2" />
            <p className="text-xs text-text-muted">No sessions yet.</p>
            <p className="text-xs text-text-muted">Start a conversation!</p>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div key={group.label} className="mb-2">
              <div className="px-4 py-1.5">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              <AnimatePresence>
                {group.sessions.map((session, si) => (
                  <motion.button
                    key={session.session_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: gi * 0.05 + si * 0.04 }}
                    onClick={() => onSessionSelect(session.session_id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-raised transition-colors ${
                      activeSessionId === session.session_id
                        ? 'border-l-2 border-accent-indigo bg-accent-indigo/5'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-text-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-secondary truncate">
                        {session.session_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-text-muted" />
                        <span className="text-xs text-text-muted">{session.date}</span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">{session.turn_count} turns</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
