# Frontend Architecture

This document outlines the recommended architecture for the Voice Agent frontend application. While the framework choice (Next.js, Vite/React, Vue) is flexible, this structure ensures separation of concerns, scalability, and ease of maintenance.

## 1. Directory Structure

```text
src/
├── api/                 # REST API integrations (Axios/Fetch wrappers)
│   ├── auth.ts          # Login, Signup, Me
│   └── voice.ts         # Token generation endpoint
├── components/          # Reusable UI components
│   ├── auth/            # Login/Signup forms
│   ├── voice/           # Voice agent specific UI (Visualizer, Controls)
│   ├── layout/          # Page wrappers, Navigation
│   └── ui/              # Base design system components (Buttons, Inputs)
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Global authentication state
│   └── useVoiceAgent.ts # LiveKit room state, connection logic
├── store/               # Global State Management (Zustand/Redux/Context)
│   └── useAppStore.ts
├── pages/               # Route components (or app/ in Next.js)
│   ├── index.tsx        # Landing / Dashboard
│   ├── login.tsx
│   └── room.tsx         # Active voice session view
├── utils/               # Helpers, formatters, error handling
└── styles/              # Global CSS, Design System variables
```

## 2. Separation of Concerns

### A. The Service/API Layer (`src/api/`)
This layer handles all HTTP communication. It abstracts away REST semantics (URLs, headers, JSON parsing). UI components should never call `fetch` or `axios` directly; they should call service methods like `authService.login()`.

### B. The Voice/LiveKit Layer (`src/hooks/useVoiceAgent.ts`)
This layer encapsulates the `livekit-client` SDK. 
It exposes a clean, framework-agnostic interface to the UI:
- `connect()`
- `disconnect()`
- `state` (IDLE, CONNECTING, WARMING_UP, CONNECTED, ERROR)
- `transcripts` (Array of message objects)
- `error` (Error string if applicable)

### C. The UI Layer (`src/components/`)
Components are strictly responsible for rendering based on state and capturing user input. For example, the `VoiceRoom` component renders the `Visualizer` based on the current LiveKit audio track and renders the "Disconnect" button, which calls `disconnect()` on the voice hook.

## 3. Data Flow

1. **Authentication:** User enters credentials -> `AuthForm` calls `authApi.login()` -> API returns JWT -> Saved to local storage -> Global Auth State updates -> UI routes to `/room`.
2. **Session Start:** User clicks "Connect to Agent" -> `useVoiceAgent` calls `voiceApi.getToken()` -> API returns LiveKit token -> Hook initializes LiveKit Room -> Room connects.
3. **Session Active:** Agent speaks -> LiveKit fires `TrackSubscribed` -> Hook attaches audio track -> UI transitions to `CONNECTED` state. Transcripts arrive via Data Channels -> Hook parses JSON -> Appends to transcript array -> React re-renders `TranscriptBox`.

## 4. Protected Routes
Implement a Higher-Order Component (HOC) or route guard that checks the global auth state. If a user attempts to access `/room` without a valid JWT token, redirect them to `/login`.
