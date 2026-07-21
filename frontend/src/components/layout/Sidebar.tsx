import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic2,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  LayoutDashboard,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/console',   icon: Mic2,            label: 'Console'   },
  { to: '/history',   icon: History,          label: 'History'   },
  { to: '/settings',  icon: Settings,         label: 'Settings'  },
];


export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-surface border-r border-border overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center shadow-glow-sm">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-bold text-white whitespace-nowrap"
            >
              Voice AI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 py-4 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <div className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-2 py-3 border-t border-border">
        <div className="sidebar-item" onClick={handleLogout}>
          <LogOut className="w-4 h-4 flex-shrink-0 text-red-400" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="whitespace-nowrap text-red-400"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && user && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-surface-raised">
            <p className="text-xs font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-14 w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-white hover:border-border-bright transition-colors z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
