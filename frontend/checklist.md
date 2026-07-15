# Voice AI Agent — Frontend Implementation Checklist
> Live progress tracker. Update as tasks complete.
> Legend: `[ ]` todo · `[/]` in progress · `[x]` done

---

## DAY 0 — Backend Interruption Fix (✅ ALREADY DONE — commit `73ce0d7`)

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

## DAY 1 — Foundation, Auth & Backend Additions

### 1.1 Project Scaffold
- [ ] `npx create-vite@latest . -- --template react-ts` inside `frontend/`
- [ ] Install all core dependencies (livekit, framer-motion, zustand, tanstack-query, react-hook-form, zod, axios, recharts, lucide-react, react-router-dom)
- [ ] Install TailwindCSS v3 + PostCSS + Autoprefixer
- [ ] Init shadcn/ui (`npx shadcn@latest init`)
- [ ] Configure `vite.config.ts` — path aliases (`@/`) + proxy to `http://localhost:8000`
- [ ] Configure `tsconfig.app.json` — strict mode + path aliases
- [ ] Configure `tailwind.config.ts` — extend with brand tokens

### 1.2 Design System & Tokens
- [ ] `src/styles/globals.css` — CSS variables (bg, surface, border, accent, text, status colors)
- [ ] Inter font via Google Fonts import
- [ ] Tailwind theme extensions (brand colors, font family, border-radius, shadows)
- [ ] Add shadcn/ui components: `button`, `input`, `card`, `badge`, `drawer`, `toast`, `skeleton`, `tooltip`, `separator`, `dialog`, `switch`, `select`, `sheet`

### 1.3 App Shell & Routing
- [ ] `src/App.tsx` — React Router v6 routes + `QueryClientProvider` + `Toaster`
- [ ] `/` redirect based on auth state
- [ ] `/login` → `AuthPage`
- [ ] `/console` → `ConsolePage` (ProtectedRoute)
- [ ] `src/components/layout/ProtectedRoute.tsx` — JWT guard → redirect to `/login`
- [ ] `src/components/layout/Sidebar.tsx` — collapsible left nav
- [ ] `src/components/layout/TopBar.tsx` — logo, avatar, connection quality, shortcuts button
- [ ] `src/components/shared/ErrorBoundary.tsx`
- [ ] `src/components/shared/LoadingSkeleton.tsx`

### 1.4 Auth Feature
- [ ] `src/lib/axios.ts` — Axios instance + interceptors (Bearer token, 401 → logout)
- [ ] `src/lib/queryClient.ts` — TanStack Query config
- [ ] `src/store/useAppStore.ts` — Zustand `{ user, token, setToken, logout }` + localStorage persist
- [ ] `src/types/auth.ts` — User, Token, LoginPayload, SignupPayload types
- [ ] `src/features/auth/schemas/authSchemas.ts` — Zod schemas
- [ ] `src/features/auth/api/authApi.ts` — login(), signup(), getMe(), getConversations(), getSessions()
- [ ] `src/features/auth/hooks/useAuth.ts` — TanStack Query hooks
- [ ] `src/features/auth/components/LoginForm.tsx`
- [ ] `src/features/auth/components/SignupForm.tsx`
- [ ] `src/features/auth/AuthPage.tsx` — split layout: left orb decoration, right form card
- [ ] Auth animations (fade-in, focus glow, button tap scale)
- [ ] End-to-end test: signup → login → redirect to `/console`

### 1.5 Backend Additions (minimal, non-breaking)
- [ ] `backend/api/auth_routes.py` — `GET /auth/conversations` endpoint
- [ ] `backend/api/auth_routes.py` — `GET /auth/sessions` endpoint
- [ ] `backend/pipeline/voice_pipeline.py` — DataChannel emit for user transcript
- [ ] `backend/pipeline/voice_pipeline.py` — DataChannel emit for agent transcript
- [ ] `backend/agent/nodes.py` — DataChannel emit for tool_start event
- [ ] `backend/agent/nodes.py` — DataChannel emit for tool_end event
- [ ] Verify backend still starts correctly after changes

### 1.6 Recents Sidebar
- [ ] `src/features/console/components/SessionsSidebar.tsx`
- [ ] "New Session" button (disconnect + clear + new room UUID)
- [ ] Recents list from `GET /auth/sessions` — grouped by Today/Yesterday/Earlier
- [ ] Session card: name (first 40 chars), date badge, turn count
- [ ] Click session → load transcript from `GET /auth/conversations`
- [ ] Active session: indigo left border highlight
- [ ] Framer Motion stagger load animation

### 1.7 Console Skeleton
- [ ] `src/features/console/ConsolePage.tsx` — 3-panel layout
- [ ] Loading skeletons for all panels
- [ ] Voice ID named dropdown at top (Aria, Nova, Echo, Sage, Orion)

---

## DAY 2 — Core Voice Console

### 2.1 Types & Stores
- [ ] `src/types/agent.ts` — AgentState, TranscriptMessage, ToolEvent, LatencyEntry
- [ ] `src/store/useSessionStore.ts` — transcripts[], toolEvents[], agentState, latencyHistory[]
- [ ] `src/store/useSettingsStore.ts` — selectedVoiceId, devMode (localStorage persist)

### 2.2 Voice Agent Hook
- [ ] `src/features/console/api/voiceApi.ts` — `getToken(roomName, participantName)`
- [ ] `src/features/console/hooks/useVoiceAgent.ts` — complete LiveKit state machine
  - [ ] IDLE → CONNECTING → WARMING_UP → CONNECTED → LISTENING/THINKING/SPEAKING → ERROR/DISCONNECTED
  - [ ] connect() + disconnect() functions
  - [ ] RoomEvent.Connected → WARMING_UP
  - [ ] RoomEvent.TrackSubscribed (audio) → CONNECTED + attach track
  - [ ] RoomEvent.DataReceived → parse transcript/tool events → session store
  - [ ] RoomEvent.Disconnected → ERROR state + toast
  - [ ] 10s warmup timeout → ERROR + toast
  - [ ] Continuous listening: mic always on when CONNECTED
  - [ ] **Barge-in (interruption) UX** — backend handles interruption automatically; frontend must:
    - [ ] Do NOT suppress/mute local mic while agent is speaking (barge-in is always on)
    - [ ] When `RoomEvent.DataReceived` delivers a new **user** transcript mid-agent speech → immediately clear any "agent speaking" visual indicator
    - [ ] Orb/visualizer transitions: SPEAKING → LISTENING immediately on user speech detection (no extra event needed; VAD fires on backend, new user transcript arrives via DataChannel)
    - [ ] Graceful continuation: next **agent** transcript after an interruption may begin with an acknowledgement word ("Gotcha", "Sure") — do NOT skip or strip these

### 2.3 Waveform Hook
- [ ] `src/features/console/hooks/useWaveform.ts`
  - [ ] Web Audio API AnalyserNode on agent audio track
  - [ ] Returns amplitude (0–1) per animation frame
  - [ ] Fallback: synthetic sine wave if Web Audio API unavailable

### 2.4 Glowing Orb Visualizer ⭐ (Centerpiece)
- [ ] `src/features/console/components/OrbVisualizer.tsx`
  - [ ] SVG luminous ring + 2 wisp/comet arcs (matches reference image)
  - [ ] 3 glow layers (concentric SVG circles, blur filter)
  - [ ] Framer Motion useAnimationControls() for state transitions
  - [ ] IDLE: stationary, dim white ring
  - [ ] CONNECTING: slow clockwise rotation, cool blue
  - [ ] WARMING_UP: gentle pulse, soft orange
  - [ ] LISTENING: mic-amplitude reactive jiggle, blue/violet
  - [ ] THINKING: fast wisp rotation, electric blue
  - [ ] TOOL_EXECUTING: multi-color shimmer
  - [ ] SPEAKING: audio-reactive warp + bright violet glow jiggle
  - [ ] ERROR: red tint, slow fade pulse
  - [ ] Smooth 200ms crossfade between all states

### 2.5 Agent Status Badge
- [ ] `src/features/console/components/AgentStatusBadge.tsx`
  - [ ] Animated dot + label text
  - [ ] Framer Motion color transitions
  - [ ] CSS pulse animation during WARMING_UP/CONNECTING

### 2.6 Transcript Panel
- [ ] `src/features/console/components/TranscriptPanel.tsx`
  - [ ] Auto-scroll to bottom on new message
  - [ ] User messages: right-aligned, green accent bar
  - [ ] Agent messages: left-aligned, indigo accent bar
  - [ ] Glassmorphism bubbles
  - [ ] Streaming `···` dots indicator
  - [ ] Framer Motion AnimatePresence slide-in per message
  - [ ] Timestamp + role avatar on hover
  - [ ] Empty state with soft prompt

### 2.7 Control Bar
- [ ] `src/features/console/components/ControlBar.tsx`
  - [ ] Connect button (green) → Disconnect (red) → Reconnect (green) cycle
  - [ ] Framer Motion spring transitions between button states
  - [ ] Mute toggle with mic slash animation
  - [ ] Loading spinner during CONNECTING/WARMING_UP
  - [ ] Keyboard shortcut hint labels

### 2.8 Warmup Hint
- [ ] `src/features/console/components/WarmupHint.tsx`
  - [ ] Visible only during WARMING_UP
  - [ ] 10s countdown timer
  - [ ] "Agent is starting up..." message
  - [ ] Framer Motion fade-in/out

### 2.9 Connection Quality
- [ ] `src/features/console/components/ConnectionQuality.tsx`
  - [ ] 4-bar signal strength from room.connectionQuality
  - [ ] Color: green → yellow → red
  - [ ] Tooltip with ping ms

### 2.10 Keyboard Shortcuts
- [ ] `src/features/console/hooks/useKeyboardShortcuts.ts`
  - [ ] Cmd+Enter → connect/disconnect
  - [ ] Cmd+M → mute toggle
  - [ ] Cmd+, → open settings
  - [ ] ? → shortcuts modal
  - [ ] Esc → close modals
- [ ] `src/components/shared/KeyboardShortcutsModal.tsx` — Raycast-style dialog

### 2.11 Toast Notifications
- [ ] `src/lib/toast.ts` — Sonner wrapper
  - [ ] Connected, Disconnected, Error, Mic denied, Tool used, Expired session toasts

### 2.12 Full Integration Test
- [ ] login → connect → speak → transcript → tool → disconnect → Recents updated

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
| Day 1 | 32 | 0 | 32 |
| Day 2 | 37 | 0 | 37 |
| Day 3 | 33 | 0 | 33 |
| **Total** | **119** | **17** | **102** |
