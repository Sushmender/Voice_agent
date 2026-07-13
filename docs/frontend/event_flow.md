# Application Event Flow

This document outlines the sequential flow of events from the moment a user initiates a session to the point they disconnect. Understanding this flow is crucial for synchronizing the frontend UI state with the backend LiveKit pipeline.

## 1. Complete Session Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as FastAPI Backend
    participant LK as LiveKit Cloud
    participant Pipeline as Pipecat Agent Pipeline

    User->>UI: Click "Connect"
    UI->>UI: State = CONNECTING
    UI->>API: POST /api/token
    API-->>Pipeline: Launch pipeline task (Async)
    API-->>UI: Return 200 OK (JWT Token + URL)
    
    UI->>LK: Room.connect(URL, Token)
    LK-->>UI: RoomEvent.Connected
    UI->>UI: State = WARMING_UP (Show Hint)
    
    Pipeline->>LK: Agent joins room
    Pipeline->>Pipeline: Pre-warm VAD & Load LangGraph
    
    Pipeline->>LK: Publish Audio Track
    LK-->>UI: RoomEvent.TrackSubscribed
    UI->>UI: State = CONNECTED (Hide Hint)
    UI->>UI: Attach audio track to DOM
    
    Pipeline->>LK: Send Greeting Audio ("Hi, I'm ready!")
    LK-->>UI: Audio plays through speakers
    
    User->>UI: Speaks ("Hello agent")
    UI->>LK: Streams local microphone audio
    LK->>Pipeline: Audio frames
    
    Pipeline->>Pipeline: VAD detects speech end
    Pipeline->>Pipeline: STT -> "Hello agent"
    Pipeline->>LK: DataChannel: Transcript (Role: User)
    LK-->>UI: RoomEvent.DataReceived
    UI->>UI: Append user transcript to UI
    
    Pipeline->>Pipeline: LangGraph LLM Generation
    Pipeline->>Pipeline: TTS Audio Synthesis
    
    Pipeline->>LK: DataChannel: Transcript (Role: Agent)
    LK-->>UI: RoomEvent.DataReceived
    UI->>UI: Append agent transcript to UI
    Pipeline->>LK: Agent audio frames
    LK-->>UI: Audio plays through speakers
    
    User->>UI: Click "Disconnect"
    UI->>LK: Room.disconnect()
    UI->>UI: State = DISCONNECTED
    LK->>Pipeline: User left room event
    Pipeline->>Pipeline: Graceful shutdown & Memory clear
```

## 2. Key Synchronization Points

1. **The Warmup Gap:** There is a distinct gap between `Room.connect()` succeeding (Frontend hits LiveKit) and `TrackSubscribed` firing (Pipecat agent is fully booted and broadcasting). This takes 3-5 seconds. The frontend MUST handle this gracefully by showing a loading/warming up indicator.
2. **The Greeting:** Do not attempt to play your own greeting sound on the frontend. The agent pipeline is hardcoded to say "Hi, I'm ready!" the exact millisecond its audio track is established.
3. **Data Channel Transcripts:** Transcripts arrive asynchronously via LiveKit's Data Channel. They are pushed by the backend pipeline as soon as STT (for user) or LLM text (for agent) is available, which is usually *before* the TTS audio finishes playing. 
