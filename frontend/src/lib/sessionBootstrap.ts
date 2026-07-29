/**
 * frontend/src/lib/sessionBootstrap.ts
 * ─────────────────────────────────────
 * Runs once after a successful login to determine whether the backend was
 * restarted since the user's last session.
 *
 * Detection strategy (Option C):
 *   After login, call GET /api/session/exists?room_name=<stored_room>.
 *   - exists = false → backend was restarted (InMemory session gone)
 *                    → clear the stored room name, force a new session.
 *   - exists = true  → backend is still running with session intact
 *                    → continue as normal (existing flow).
 *   - No stored room → user has never had a session → fresh start.
 *
 * Returns:
 *   { forceNewSession: boolean }
 *
 * The forceNewSession flag is passed as router location state to DashboardPage,
 * which uses it to show the appropriate UI.
 */

import { checkSessionExists } from '../features/auth/api/authApi';

const ROOM_NAME_LS_KEY = 'voice_agent_room_name';

export interface BootstrapResult {
  /** True when the backend was restarted or no session memory exists → must start fresh. */
  forceNewSession: boolean;
}

/**
 * Run this immediately after a successful login + token set.
 *
 * It is safe to call even if the backend is temporarily slow — if the
 * request fails for any reason we fall back to forceNewSession = false
 * (i.e. continue with the normal flow rather than disrupting the UX).
 */
export async function bootstrapSessionAfterLogin(): Promise<BootstrapResult> {
  const storedRoom = localStorage.getItem(ROOM_NAME_LS_KEY);

  // No stored room means this is a fresh login (first ever session, or
  // logout already cleared it). Nothing to check — let the normal flow proceed.
  if (!storedRoom) {
    return { forceNewSession: false };
  }

  try {
    const { exists } = await checkSessionExists(storedRoom);

    if (!exists) {
      // Backend restarted — InMemory session is gone.
      // Clear the stale room name so ConsolePage generates a fresh one.
      localStorage.removeItem(ROOM_NAME_LS_KEY);
      return { forceNewSession: true };
    }

    // Session is still alive in backend memory — continue as normal.
    return { forceNewSession: false };
  } catch {
    // If the check fails (e.g. network error, backend unreachable),
    // default to normal flow to avoid blocking the user unnecessarily.
    // The stored room name stays; worst case the user gets an empty session.
    return { forceNewSession: false };
  }
}
