# UI State Machine

The voice agent frontend is heavily state-driven. Managing the transition between connection phases accurately is critical for user experience, specifically to hide the backend pipeline latency (3-5 seconds).

## 1. Core States

| State | Description |
| :--- | :--- |
| **`IDLE`** | Initial state. User is authenticated but has not initiated a call. "Connect" button is visible. |
| **`CONNECTING`** | User clicked Connect. App is fetching the token via API or connecting to the LiveKit WebSocket. |
| **`WARMING_UP`** | WebSocket connected, but audio track not yet received. The Pipecat pipeline is booting up. |
| **`CONNECTED`** | Agent audio track received. The agent is active and listening. "Disconnect" button visible. |
| **`LISTENING`** | Sub-state of CONNECTED: user is actively speaking (VAD fired on backend; new user transcript received via DataChannel). |
| **`THINKING`** | Sub-state of CONNECTED: user transcript received but agent response not yet received. Pipeline is running LLM. |
| **`SPEAKING`** | Sub-state of CONNECTED: agent transcript received and TTS audio is playing. |
| **`ERROR`** | A failure occurred (network drop, auth failure, mic denied). |
| **`DISCONNECTED`** | User explicitly ended the call or the agent hung up. Returns to IDLE effectively. |

## 2. State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> IDLE
    
    IDLE --> CONNECTING : Click "Connect"
    
    CONNECTING --> ERROR : API Failure / Network Error
    CONNECTING --> ERROR : Microphone Denied
    CONNECTING --> WARMING_UP : LiveKit RoomConnected event
    
    WARMING_UP --> SPEAKING : LiveKit TrackSubscribed (Audio) — agent says "Hi I'm ready!"
    WARMING_UP --> ERROR : Pipeline timeout / Disconnect
    
    SPEAKING --> LISTENING : DataChannel user transcript received (barge-in or new turn)
    LISTENING --> THINKING : DataChannel user transcript received (VAD end-of-speech)
    THINKING --> SPEAKING : DataChannel agent transcript received
    SPEAKING --> LISTENING : Barge-in — new user DataChannel transcript mid-speech
    
    SPEAKING --> DISCONNECTED : Click "Disconnect"
    LISTENING --> DISCONNECTED : Click "Disconnect"
    THINKING --> DISCONNECTED : Click "Disconnect"
    SPEAKING --> ERROR : Connection dropped
    LISTENING --> ERROR : Connection dropped
    
    ERROR --> IDLE : Click "Try Again"
    DISCONNECTED --> IDLE : Reset
```

> **Important — Barge-In Transition:** The `SPEAKING → LISTENING` transition on interruption is triggered purely by a **user DataChannel transcript** arriving while state is `SPEAKING`. There is no separate LiveKit event for this. The mic is always on; when the agent is interrupted, TTS stops immediately on the backend and a new user transcript arrives shortly after.

## 3. UI Mapping by State

The UI should react to these states as follows:

### State: IDLE
- **Status Indicator:** "Not connected" (Gray dot)
- **Controls:** Show `Connect` button. Hide `Disconnect`.
- **Feedback:** Visualizer hidden, transcripts hidden (or cleared).

### State: CONNECTING
- **Status Indicator:** "Connecting to server..." (Yellow spinning dot)
- **Controls:** `Connect` button disabled (prevent double clicks).
- **Feedback:** Visualizer hidden.

### State: WARMING_UP
- **Status Indicator:** "Warming up agent..." (Orange pulsing dot)
- **Controls:** Show `Disconnect` button (in case they want to abort).
- **Feedback:** Display `StartupHint` component explaining the 3-5s delay. Visualizer can be set to an "idle active" state (e.g., slow wave).

### State: SPEAKING (agent speaking)
- **Status Indicator:** "Agent speaking" (Violet animated dot)
- **Controls:** Show `Disconnect` button. Show `Mute` toggle.
- **Feedback:** Orb in SPEAKING state (audio-reactive warp + bright violet glow). TTS audio plays. Mic remains active for barge-in.

### State: LISTENING (user speaking / just interrupted agent)
- **Status Indicator:** "Listening..." (Blue animated dot)
- **Controls:** Show `Disconnect` button. Show `Mute` toggle.
- **Feedback:** Orb in LISTENING state (mic-amplitude reactive jiggle, blue/violet). New user transcript bubble shown.

### State: THINKING (LLM processing)
- **Status Indicator:** "Thinking..." (Electric blue spinning dot)
- **Controls:** Show `Disconnect` button.
- **Feedback:** Orb in THINKING state (fast wisp rotation). No audio playing.

### State: ERROR
- **Status Indicator:** "Connection failed" (Red dot)
- **Controls:** Show `Connect` button (to retry).
- **Feedback:** Display specific error message banner.

## 4. Implementation Detail

When using React, this state machine can be implemented cleanly using a string literal type and a `useState` or `useReducer` hook inside the `useVoiceAgent` custom hook.

```typescript
type VoiceState = 'IDLE' | 'CONNECTING' | 'WARMING_UP' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR' | 'DISCONNECTED';

// DataChannel-driven transitions inside useVoiceAgent:
room.on(RoomEvent.DataReceived, (payload) => {
  const msg = JSON.parse(new TextDecoder().decode(payload));
  if (msg.type === 'transcript') {
    if (msg.role === 'user') {
      setState('LISTENING'); // user transcript = user is/was speaking
    } else if (msg.role === 'agent') {
      setState('SPEAKING'); // agent transcript = agent is about to speak
    }
  }
});
```
