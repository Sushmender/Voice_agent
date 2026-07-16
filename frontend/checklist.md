# Voice AI Agent — Frontend Implementation Checklist
> Live progress tracker. Update as tasks complete.
> Legend: `[ ]` todo · `[/]` in progress · `[x]` done

---

## DAY 0 — Backend Interruption Fix  ✅ DONE 

> These backend tasks are **complete**. They are documented here so the frontend developer knows exactly what the backend now provides and can build against it confidently.

### 0.1 Barge-In (Interruption) Pipeline
- [x] `InterruptionHandlerProcessor` class added to `backend/pipeline/voice_pipeline.py`
  - [x] Tracks `_bot_is_speaking` via `BotStartedSpeakingFrame` / `BotStoppedSpeakingFrame`
  - [x] On `VADUserStartedSpeakingFrame` while bot is speaking → calls `broadcast_interruption()`
  - [x] 200 ms echo-protection grace period (`_ECHO_PROTECTION_SECS`) to ignore speaker feedback
  - [x] Swallows the triggering `VADUserStartedSpeakingFrame` (VAD re-emits it cleanly)
- [x] `BotSpeakingTracker` class added (sits right before `transport.output()`)
  - [x] Secondary tracker that feeds `_bot_is_speaking` state into `InterruptionHandlerProcessor`
  - [x] Ensures state is updated even if `BotStartedSpeakingFrame` is swallowed upstream
- [x] `LangGraphLLMService` updated:
  - [x] Receives `InterruptionFrame` → sets `_was_interrupted = True`
  - [x] Next user turn: prepends system note asking agent to acknowledge interruption naturally
  - [x] `asyncio.CancelledError` on mid-turn cancellation → logs cleanly + re-raises
- [x] Pipeline wiring updated — `InterruptionHandlerProcessor` placed between VAD and STT
- [x] `BotSpeakingTracker` placed between TTS and `transport.output()`

### 0.2 DataChannel Event Emission (Backend)
- [x] User transcript emitted: `{ type: "transcript", role: "user", text, timestamp, turn }`
- [x] Agent transcript emitted: `{ type: "transcript", role: "agent", text, timestamp, turn, tool_used }`
- [x] Tool event emitted: `{ type: "tool_event", name, status: "success", output_preview, timestamp, turn }`
- [x] `_emit_dc()` helper in `LangGraphLLMService` (best-effort, non-fatal on failure)

### 0.3 Auth Route Additions
- [x] `GET /auth/conversations` endpoint added (`backend/api/auth_routes.py`)
- [x] `GET /auth/sessions` endpoint added (`backend/api/auth_routes.py`)

### 0.4 LangGraph Agent Fixes
- [x] `backend/agent/graph.py` — graceful `CancelledError` handling during LLM node
- [x] `backend/agent/nodes.py` — minor node cleanup

---

## DAY 1 — Foundation, Auth & Backend Additions ✅ DONE

### 1.1 Project Scaffold
- [x] `npx create-vite@latest . -- --template react-ts` inside `frontend/`
- [x] Install all core dependencies (livekit-client, framer-motion, zustand, @tanstack/react-query, react-hook-form, zod, axios, recharts, lucide-react, react-router-dom, sonner)
- [x] Install TailwindCSS v3 + PostCSS + Autoprefixer + @hookform/resolvers
- [x] Configure `vite.config.ts` — path aliases (`@/`) + proxy to `http://localhost:8000`
- [x] Configure `tsconfig.app.json` — strict mode + path aliases
- [x] Configure `tailwind.config.js` — extend with brand tokens (colors, shadows, animations)

### 1.2 Design System & Tokens
- [x] `src/styles/globals.css` — CSS variables (bg, surface, border, accent, text, status colors)
- [x] Inter font via Google Fonts import
- [x] Tailwind theme extensions (brand colors, font family, border-radius, glow shadows)
- [x] CSS component classes: `.input-field`, `.btn-primary`, `.btn-ghost`, `.glass-card`, `.skeleton`, `.sidebar-item`, `.badge`, `.status-dot`

### 1.3 App Shell & Routing
- [x] `src/App.tsx` — React Router v6 routes + `QueryClientProvider` + `Toaster` (Sonner)
- [x] `/` redirect based on auth state (token present → `/console`, else → `/login`)
- [x] `/login` → `AuthPage`
- [x] `/console` → `ConsolePage` (ProtectedRoute)
- [x] `src/components/layout/ProtectedRoute.tsx` — JWT guard → redirect to `/login`
- [x] `src/components/layout/Sidebar.tsx` — collapsible left nav with Framer Motion width animation
- [x] `src/components/layout/TopBar.tsx` — logo, avatar with initials, shortcuts button
- [x] `src/components/shared/ErrorBoundary.tsx`
- [x] `src/components/shared/LoadingSkeleton.tsx` — shimmer skeleton, CardSkeleton, PanelSkeleton

### 1.4 Auth Feature
- [x] `src/lib/axios.ts` — Axios instance + interceptors (Bearer token, 401 → logout + redirect)
- [x] `src/lib/queryClient.ts` — TanStack Query config (staleTime, retry, refetchOnWindowFocus: false)
- [x] `src/store/useAppStore.ts` — Zustand `{ user, token, setToken, setUser, logout }` + localStorage persist
- [x] `src/types/auth.ts` — User, Token, LoginPayload, SignupPayload, ConversationTurn, Session types
- [x] `src/features/auth/schemas/authSchemas.ts` — Zod schemas (loginSchema, signupSchema)
- [x] `src/features/auth/api/authApi.ts` — login() [x-www-form-urlencoded], signup(), getMe(), getConversations(), getSessions()
- [x] `src/features/auth/hooks/useAuth.ts` — useLoginMutation, useSignupMutation, useGetMe, useGetSessions, useGetConversations
- [x] `src/features/auth/components/LoginForm.tsx` — RHF + Zod + password toggle + inline server error
- [x] `src/features/auth/components/SignupForm.tsx` — RHF + Zod + auto-login after signup
- [x] `src/features/auth/AuthPage.tsx` — split layout: left animated orb + feature pills, right glass form card
- [x] Auth animations: fade-in, AnimatePresence login↔signup slide, Framer Motion button tap scale
- [x] Verified: `0 TypeScript errors`, dev server running at http://localhost:5173

### 1.5 Backend Additions (minimal, non-breaking)
- [x] `backend/api/auth_routes.py` — `GET /auth/conversations` endpoint *(already done — line 75)*
- [x] `backend/api/auth_routes.py` — `GET /auth/sessions` endpoint *(already done — line 114)*
- [x] `backend/pipeline/voice_pipeline.py` — DataChannel emit for user/agent transcript *(Day 0, commit 73ce0d7)*
- [x] `backend/agent/nodes.py` — DataChannel emit for tool_start/tool_end events *(Day 0, commit 73ce0d7)*
- [x] Backend verified running correctly

### 1.6 Recents Sidebar
- [x] `src/features/console/components/SessionsSidebar.tsx`
- [x] "New Session" button (clears active session state)
- [x] Recents list from `GET /auth/sessions` — grouped by Today/Yesterday/Earlier
- [x] Session card: truncated name, date, turn count
- [x] Active session: indigo left border highlight
- [x] Framer Motion stagger load animation

### 1.7 Console Skeleton
- [x] `src/features/console/ConsolePage.tsx` — 3-panel layout (sessions | main+orb | transcript)
- [x] Loading skeletons for all panels (PanelSkeleton in right panel)
- [x] Voice ID named dropdown at top (Aria, Nova, Echo, Sage, Orion)

---

## DAY 2 — Core Voice Console ✅ DONE

### 2.1 Types & Stores
- [x] `src/types/agent.ts` — AgentState, SpeakingState, TranscriptMessage, ToolEvent, LatencyEntry, DCPayload
- [x] `src/store/useSessionStore.ts` — transcripts[], toolEvents[], agentState, speakingState, latencyHistory[]
- [x] `src/store/useSettingsStore.ts` — selectedVoiceId, devMode (localStorage persist)

### 2.2 Voice Agent Hook
- [x] `src/features/console/api/voiceApi.ts` — `getToken(roomName, participantName)`
- [x] `src/features/console/hooks/useVoiceAgent.ts` — complete LiveKit state machine
  - [x] IDLE → CONNECTING → WARMING_UP → CONNECTED → LISTENING/SPEAKING → ERROR
  - [x] connect() + disconnect() functions
  - [x] RoomEvent.Connected → WARMING_UP
  - [x] RoomEvent.TrackSubscribed (audio) → CONNECTED + attach track
  - [x] RoomEvent.DataReceived → parse transcript/tool events → session store
  - [x] RoomEvent.Disconnected → ERROR state + toast
  - [x] 10s warmup timeout → ERROR + toast
  - [x] Mic permission check (NotAllowed + NotFound handled)
  - [x] Barge-in: user DataReceived mid-SPEAKING → immediate snap to LISTENING
  - [x] Reconnecting/Reconnected events handled with persistent toasts

### 2.3 Waveform Hook
- [x] `src/features/console/hooks/useWaveform.ts`
  - [x] Web Audio API AnalyserNode on agent audio track
  - [x] Returns amplitude (0–1) + per-bar values per animation frame
  - [x] Fallback: synthetic sine wave if Web Audio API unavailable

### 2.4 Glowing Orb Visualizer ⭐ (Centerpiece)
- [x] `src/features/console/components/OrbVisualizer.tsx`
  - [x] 5-nested-div CSS structure (ambient halo, outer ring, mid ring, inner pulse, core)
  - [x] Gradient border technique on outer + mid rings
  - [x] Tracking dots on rings (blue top, violet bottom)
  - [x] IDLE: dim, all animations paused
  - [x] CONNECTING: conic sweep overlay + rings start spinning
  - [x] WARMING_UP: amber core gradient + amber bars
  - [x] CONNECTED/QUIET: indigo-blue sphere gradient
  - [x] LISTENING: blue emphasis gradient + blue bars
  - [x] SPEAKING: violet gradient + 2 ripple rings (staggered)
  - [x] ERROR: red core tint + error-shake animation
  - [x] Amplitude-reactive audio bars (7 bars, all 4 modes)
  - [x] All state transitions with 0.4s CSS transition

### 2.5 Agent Status Badge
- [x] `src/features/console/components/AgentStatusBadge.tsx`
  - [x] All 7 states with exact colors from DESIGN_REFERENCE
  - [x] Spinning arc for CONNECTING, dot-pulse for WARMING_UP
  - [x] AnimatePresence crossfade on state change

### 2.6 Transcript Panel
- [x] `src/features/console/components/TranscriptPanel.tsx`
  - [x] Auto-scroll to bottom on new message
  - [x] User bubbles: green accent bar + green text
  - [x] Agent bubbles: indigo accent bar + indigo text
  - [x] AnimatePresence bubble-in per message
  - [x] Typing indicator: 3 animated dots
  - [x] "TRANSCRIPT" header with Clear + Copy buttons
  - [x] Barge-in hint strip (only visible during SPEAKING)
  - [x] Empty state with prompt

### 2.7 Control Bar
- [x] `src/features/console/components/ControlBar.tsx`
  - [x] Connect btn-primary (IDLE/ERROR) → spinner "Connecting…" → Disconnect danger circle
  - [x] 52×52px Mute/Volume icon-circles with muted state (red glow)
  - [x] 64×64px Disconnect danger button
  - [x] All controls disabled when not CONNECTED
  - [x] Framer Motion spring tap scale

### 2.8 Warmup Hint
- [x] `src/features/console/components/WarmupHint.tsx`
  - [x] Visible only during WARMING_UP (AnimatePresence fade-up)
  - [x] 4s progress bar animation (stops at 80%)
  - [x] glass-inner card, amber icon + message

### 2.9 Pipeline Strip
- [x] `src/features/console/components/PipelineStrip.tsx`
  - [x] ASR→LLM→TTS badges, inferred from state
  - [x] Active stage: color glow + dot-pulse
  - [x] Arrow connectors between stages

### 2.10 Waveform Strip
- [x] `src/features/console/components/WaveformStrip.tsx`
  - [x] 20 bars driven by useWaveform amplitude
  - [x] State-driven colors (idle/listening/speaking/warming)

### 2.11 Connection Quality
- [x] `src/features/console/components/ConnectionQuality.tsx`
  - [x] 4-bar signal strength from LiveKit ConnectionQuality enum
  - [x] Color coding: green/yellow/red

### 2.12 Keyboard Shortcuts
- [x] `src/features/console/hooks/useKeyboardShortcuts.ts`
  - [x] Cmd+Enter → connect/disconnect
  - [x] Cmd+M → mute toggle
  - [x] Cmd+, → open settings
  - [x] ? → shortcuts modal
- [x] `src/components/shared/KeyboardShortcutsModal.tsx` — Raycast-style dialog

### 2.13 Toast Notifications
- [x] `src/lib/toast.ts` — Typed Sonner wrapper
  - [x] connected, disconnected, connectionLost, reconnecting, reconnected
  - [x] agentTimeout, tokenError, micDenied, micNotFound, sessionExpired
  - [x] toolUsed, copied, dismiss

### 2.14 Full Integration
- [x] `src/features/console/ConsolePage.tsx` — fully wired:
  - [x] Top bar: back button + session label + StatusPill + timer + voice selector + shortcuts btn
  - [x] Left stage: OrbVisualizer + StateLabel + WaveformStrip + PipelineStrip + WarmupHint + ControlBar
  - [x] Right: TranscriptPanel with barge-in hint
  - [x] Background nebula layers
  - [x] AnimatePresence error banner
  - [x] Keyboard shortcuts wired

### 2.15 Globals CSS
- [x] Added keyframes: orb-error-shake, ripple-out, progress-fill, bar animations, dot-pulse
- [x] Added component classes: viz-bar-*, glass-inner, btn-icon-circle, btn-danger, btn-secondary

### 2.16 App Routing
- [x] `src/App.tsx` — AnimatePresence page transitions (fade-up enter, fade-down exit)
- [x] Stub routes: /dashboard, /history, /settings (Day 3)
- [x] Updated Toaster to match DESIGN_REFERENCE toast spec

### 2.17 Verification
- [x] `npx tsc --noEmit` → 0 TypeScript errors
- [x] `npm run dev` → server running at http://localhost:5173
- [x] Auth page renders correctly with nebula background
- [x] Route guard works (unauthenticated → /login)
- [x] Zero JS runtime errors in browser console

---

## DAY 3 — Advanced Features, Polish & Delivery

### 3.1 Tool Execution Timeline
- [ ] `src/features/console/components/ToolTimeline.tsx`
  - [ ] Vertical timeline per session
  - [ ] Lucide icons per tool type
  - [ ] Status: running (Loader2) / success (CheckCircle2) / error (XCircle)
  - [ ] Duration pill + Framer Motion stagger

### 3.2 Session Memory Viewer
- [ ] `src/features/console/components/MemoryViewer.tsx`
  - [ ] Collapsible panel, turn counter badge
  - [ ] "Clear Session" button + confirmation

### 3.3 Latency Metrics Panel
- [ ] `src/features/console/hooks/useLatency.ts` — per-turn latency tracking
- [ ] `src/features/console/components/LatencyPanel.tsx`
  - [ ] Recharts AreaChart
  - [ ] Avg/P95 metric cards
  - [ ] Color coded (green/yellow/red)
  - [ ] Dev mode only

### 3.4 Settings Drawer
- [ ] `src/features/settings/components/SettingsDrawer.tsx`
  - [ ] Voice dropdown (Aria, Nova, Echo, Sage, Orion)
  - [ ] Dev mode toggle
  - [ ] Clear session danger button + confirm dialog
  - [ ] Persisted in useSettingsStore

### 3.5 History Page
- [ ] `src/features/history/HistoryPage.tsx`
  - [ ] Session list sorted newest first
  - [ ] Session card: date, turns, duration, first message
  - [ ] Click → full transcript modal
  - [ ] Empty state + loading skeletons

### 3.6 Error Handling Polish
- [ ] All API errors → toast + inline error
- [ ] ErrorBoundary wraps all routes
- [ ] Mic NotAllowedError → banner with instructions
- [ ] Mic NotFoundError → banner
- [ ] Pipeline timeout → retry button
- [ ] 401 mid-session → auto logout

### 3.7 Animation Polish
- [ ] Route transitions (Framer Motion AnimatePresence)
- [ ] Sidebar collapse animation
- [ ] Orb final polish — all 8 state transitions tested
- [ ] prefers-reduced-motion media query disables animations

### 3.8 Accessibility
- [ ] aria-live="polite" on transcript panel
- [ ] aria-label on all icon buttons
- [ ] Focus trap in drawers and modals
- [ ] Tab-navigable control bar
- [ ] 44×44px minimum touch targets

### 3.9 Build Validation
- [ ] `npm run type-check` → 0 TypeScript errors
- [ ] `npm run lint` → 0 ESLint warnings
- [ ] `npm run build` → clean production bundle

### 3.10 App Instructions File
- [ ] `app_instructions.md` in repo root
  - [ ] Prerequisites (Node 20+, Python 3.11+, .env setup)
  - [ ] Backend: install deps → start FastAPI → start agent worker
  - [ ] Frontend: install deps → `npm run dev`
  - [ ] All required env vars listed
  - [ ] Troubleshooting: mic permission, CORS, LiveKit warmup, MongoDB

### 3.11 Final QA
- [ ] signup → login → console redirect ✓
- [ ] Orb: IDLE stationary, SPEAKING jiggle ✓
- [ ] Connect (green) → active session → Disconnect (red) → Reconnect (green) ✓
- [ ] User transcript appears (green) ✓
- [ ] Agent transcript appears (indigo) ✓
- [ ] Tool timeline shows events ✓
- [ ] Recents sidebar updates after session ✓
- [ ] New Session starts fresh ✓
- [ ] Voice dropdown changes voice ✓
- [ ] All keyboard shortcuts work ✓
- [ ] Settings drawer persists ✓
- [ ] Dev mode: latency chart ✓
- [ ] Build succeeds, 0 TS errors ✓

---

## Progress Summary

| Day | Tasks | Done | Remaining |
|-----|-------|------|-----------|
| Day 0 (Backend interruption fix) | 17 | 17 | 0 |
| Day 1 | 40 | 40 | 0 |
| Day 2 | 37 | 37 | 0 |
| Day 3 | 33 | 0  | 33 |
| **Total** | **127** | **94** | **33** |

