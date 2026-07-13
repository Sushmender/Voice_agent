# LiveKit Contract

The voice agent relies on **LiveKit** for sub-100ms latency real-time communication. The frontend must implement the LiveKit Web SDK (`livekit-client`) to send user audio, receive agent audio, and receive text transcripts.

## 1. Connecting to the Room

After retrieving the `livekit_url` and `token` from `POST /api/token`, the frontend initializes the LiveKit Room.

```javascript
import { Room, RoomEvent, Track } from 'livekit-client';

const room = new Room({
  adaptiveStream: true,
  dynacast: true,
});

// Enable microphone before or immediately after connecting
await room.localParticipant.setMicrophoneEnabled(true);

await room.connect(livekit_url, token);
```

## 2. Event Listeners

The frontend must listen to the following critical LiveKit Room events:

### A. RoomEvent.Connected
Fired when the user successfully connects to the room WebSocket.
- **Action:** Update UI state to `WARMING_UP`.
- **Reason:** The room is joined, but the Pipecat agent takes 3-5 seconds to boot (pre-warming VAD models, negotiating WebRTC). The user should *not* speak yet.

### B. RoomEvent.TrackSubscribed
Fired when a remote participant (the AI Agent) publishes a track and the frontend subscribes to it.
- **Action:** Attach the audio track to the DOM, update UI state to `CONNECTED`.
- **Reason:** When the agent's audio track is subscribed, the pipeline is fully ready. The agent will immediately say "Hi, I'm ready!".

```javascript
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Audio) {
    track.attach(); // Plays agent audio through the browser
    // Set UI State -> CONNECTED
  }
});
```

### C. RoomEvent.DataReceived
Fired when a participant sends arbitrary data over LiveKit Data Channels. The backend uses this to stream conversation transcripts.

- **Action:** Parse the JSON payload and append to the transcript UI.
- **Format:**
  ```json
  {
    "type": "transcript",
    "role": "user", // or "agent"
    "text": "Hello, how can you help me today?"
  }
  ```

```javascript
room.on(RoomEvent.DataReceived, (payload, participant) => {
  try {
    const msg = JSON.parse(new TextDecoder().decode(payload));
    if (msg.type === 'transcript') {
      // Append msg.text to UI, differentiated by msg.role
    }
  } catch (error) {
    console.error("Failed to parse data channel message");
  }
});
```

### D. RoomEvent.Disconnected
Fired when the connection drops or the user leaves intentionally.
- **Action:** Reset UI, clear transcripts (optional), and update UI state to `DISCONNECTED`.

## 3. Disconnecting

To cleanly exit the session:
```javascript
await room.disconnect();
```
The backend automatically detects when the room is empty and will shut down the Pipecat pipeline gracefully to save compute resources.

## 4. Microphone Management

The frontend is responsible for requesting microphone permissions from the browser.
If `room.localParticipant.setMicrophoneEnabled(true)` fails with a `NotAllowedError`, the frontend must gracefully instruct the user to allow microphone access in their browser settings.
