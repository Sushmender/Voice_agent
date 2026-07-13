# Frontend Components Breakdown

To ensure a modular and maintainable codebase, the frontend should be composed of distinct, self-contained components. Below are the recommended key components required for the Voice Agent application.

## 1. Authentication Components

### `LoginForm` & `SignupForm`
- **Purpose:** Capture user credentials.
- **Responsibilities:**
  - Form validation (email formatting, password length).
  - Triggering API calls via the Auth Service.
  - Displaying API errors (e.g., "Incorrect email or password", "Email already registered").
  - Routing to the main dashboard on success.
- **State:** Local form state, Loading boolean.

## 2. Voice Agent Session Components

### `VoiceRoom` (Container Component)
- **Purpose:** The main view for an active voice session.
- **Responsibilities:**
  - Manages the lifecycle of the LiveKit connection.
  - Holds the state from the `useVoiceAgent` hook (connection state, transcripts).
  - Renders child components (`Controls`, `Visualizer`, `TranscriptBox`, `StatusPill`).

### `StatusPill`
- **Purpose:** Displays the current connection state to the user.
- **Responsibilities:**
  - Maps internal state (IDLE, CONNECTING, WARMING_UP, CONNECTED) to a user-friendly UI.
  - Should include a colored indicator dot (e.g., Gray = Idle, Yellow pulse = Warming up, Green = Connected, Red = Error).

### `StartupHint`
- **Purpose:** Educates the user during the Pipecat pipeline spin-up phase.
- **Responsibilities:**
  - Displays *only* when state is `WARMING_UP`.
  - Informs the user: "Agent is warming up (3-5 seconds). You'll hear 'Hi, I'm ready!' when live."

### `AudioVisualizer`
- **Purpose:** Provides visual feedback that audio is playing or the system is active.
- **Responsibilities:**
  - CSS-based animations (e.g., bouncing bars).
  - **Advanced:** Can hook into the Web Audio API to analyze the LiveKit audio track and animate based on actual frequency/volume data. (A simple CSS CSS animation is sufficient for MVP).

### `TranscriptBox`
- **Purpose:** Displays the real-time conversation history.
- **Responsibilities:**
  - Takes an array of transcript objects as props: `[{ role: 'user', text: '...' }, { role: 'agent', text: '...' }]`.
  - Auto-scrolls to the bottom when new messages arrive.
  - Distinguishes visually between user messages and agent messages.

### `Controls`
- **Purpose:** User interactions for the session.
- **Responsibilities:**
  - "Connect" button (initiates token fetch and LiveKit connection).
  - "Disconnect" button (terminates LiveKit room).
  - Mute/Unmute microphone toggle.

## 3. Base UI Components (Design System)

To maintain consistency, implement base UI components rather than styling native HTML elements directly:
- **`Button`:** Supports variants (`primary`, `secondary`, `danger`) and states (`loading`, `disabled`).
- **`Input`:** Standardized text input with label and error message support.
- **`Card`:** Container for forms and main UI surfaces, applying standard border-radius, background, and shadows.
