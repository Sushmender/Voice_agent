# VoiceAgent Frontend — App Instructions

> Version 2.4.1 · React 19 · Vite 8 · TypeScript 6 · Tailwind 3

---

## Quick Start

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Configure environment
cp .env.example .env   # then fill in VITE_API_URL

# 3. Start dev server
npm run dev            # → http://localhost:5173
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | FastAPI backend base URL |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check → Vite production build |
| `npm run preview` | Preview the production build locally |
| `npx tsc --noEmit` | Type-check only (no emit) |

---

## Project Architecture

```
src/
├── styles/
│   └── globals.css          ← All CSS variables, keyframes, Tailwind components
├── lib/
│   ├── axios.ts             ← Axios instance with JWT interceptor
│   ├── queryClient.ts       ← TanStack Query client
│   └── toast.ts             ← Sonner toast wrappers + toast re-export
├── store/
│   ├── useAppStore.ts       ← Zustand: auth (user, token, logout)
│   ├── useSessionStore.ts   ← Zustand: live session state
│   └── useSettingsStore.ts  ← Zustand+persist: voice, devMode
├── types/
│   ├── agent.ts             ← AgentState, TranscriptMessage, ToolEvent, LatencyEntry
│   └── auth.ts              ← User, Token, Session, ConversationTurn
├── features/
│   ├── auth/                ← Login/signup page, auth API, useAuth hook
│   ├── dashboard/           ← DashboardPage (stats cards, CTA, recent sessions)
│   ├── console/             ← ConsolePage + all voice room components + hooks
│   ├── history/             ← HistoryPage (split-panel transcript viewer)
│   └── settings/            ← SettingsPage (tabbed) + SettingsDrawer (slide-in)
└── components/
    ├── layout/              ← Sidebar, TopBar, ProtectedRoute
    └── shared/              ← ErrorBoundary, KeyboardShortcutsModal, MicPermissionBanner
```

---

## Navigation

| Route | Component | Auth required |
|---|---|---|
| `/login` | `AuthPage` | No |
| `/dashboard` | `DashboardPage` | Yes |
| `/console` | `ConsolePage` | Yes |
| `/history` | `HistoryPage` | Yes |
| `/settings` | `SettingsPage` | Yes |

---

## Day 3 Features (New)

### Tool Execution Timeline
- Renders in the **TOOLS** tab of the Console right panel
- Each entry: icon (by tool name), status dot, output preview, turn badge, timestamp
- Staggered Framer Motion entrance animation

### Session Memory Viewer
- Collapsible widget below the orb controls on the Console stage
- Shows turn count badge and conversation preview
- "Clear Session" → inline confirmation if connected

### Latency Metrics Panel
- Visible only when **Dev Mode** is ON in Settings
- Area chart: TTFB vs Total response time per turn
- Color thresholds: green < 600ms, amber < 1.2s, red ≥ 1.2s
- Avg and P95 metric cards

### `useLatency` Hook
- `startTurn()` → call when user transcript arrives
- `markFirstByte()` → call on first agent token  
- `endTurn()` → writes `LatencyEntry` to session store

### Settings Drawer
- Opens from gear icon in Console (also ⌘,)
- Voice selector (5 voices), dev-mode toggle, danger zone
- Focus-trapped, Escape to close, 300ms slide-in from right

### Settings Page
- Tabbed: Profile / Audio / Agent / Account
- Profile: name edit, email read-only, avatar initials
- Audio: full voice selector with per-voice descriptors
- Agent: system prompt override, response style slider, dev mode toggle
- Account: sign out, delete account with email-confirm protection

### Dashboard Page
- Animated stat cards: sessions today, talk time, total turns
- Start Session CTA card (dashed → solid border on hover, mic scales 1.08x)
- Recent sessions list with skeleton loaders and empty state

### History Page
- Split panel: session list (38%) + transcript viewer (62%)
- Debounced search + status filter chips
- Download `.txt` and copy-to-clipboard buttons
- Turn-by-turn bubble view with tool badge highlighting

### Mic Permission Banner
- Inline banner below top bar (not full ERROR state)
- `NotAllowedError` → "How to fix" link to browser help
- `NotFoundError` → dismissible info message

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘ Enter | Connect / Disconnect |
| ⌘ M | Toggle mute |
| ⌘ , | Open Settings drawer |
| ? | Open keyboard shortcuts modal |
| Escape | Close modals/drawers |

---

## Design System Tokens

All tokens are in `src/styles/globals.css `:root {}`.

| Token | Value |
|---|---|
| `--bg-base` | `#080b12` |
| `--accent-indigo` | `#6366f1` |
| `--text-primary` | `#f0f4ff` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

**Accessibility:** All animations respect `prefers-reduced-motion` via the global media query in `globals.css`.

---

## Backend API Contract

| Endpoint | Method | Notes |
|---|---|---|
| `/auth/login` | POST | `application/x-www-form-urlencoded` (OAuth2) |
| `/auth/signup` | POST | JSON body |
| `/auth/me` | GET | Bearer token required |
| `/auth/sessions` | GET | Returns `Session[]` |
| `/auth/conversations` | GET | `?session_id=&limit=` |
| `/api/token` | POST | Returns `{ token, livekit_url }` |

> **Critical:** `livekit_url` always comes from the token response — never hardcode it.

---

## DataChannel Message Shapes

```typescript
// Transcript
{ type: "transcript", role: "user"|"agent", text: string, timestamp: string, turn?: number }

// Tool event  
{ type: "tool_event", name: string, status: "success"|"error",
  output_preview?: string, timestamp: string, turn?: number }
```

---

## State Machine

```
IDLE → CONNECTING → WARMING_UP → CONNECTED
                              ↓
                            ERROR (token fail / timeout / connection lost)
ERROR → CONNECTING (Retry)
```

Speaking sub-states (only in CONNECTED):
`QUIET → LISTENING → SPEAKING → INTERRUPTED`
