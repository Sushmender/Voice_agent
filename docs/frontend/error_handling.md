# Error Handling & Resilience

Robust error handling is critical for voice applications. This document outlines the expected error scenarios and how the frontend should respond to provide a seamless user experience.

## 1. Authentication Errors

| Scenario | HTTP Status | Frontend Action |
| :--- | :--- | :--- |
| **Invalid Login Credentials** | 401 Unauthorized | Display inline error on the Login form: "Incorrect email or password." Do not clear the email field. |
| **Email Already Registered** | 400 Bad Request | Display inline error on the Signup form: "This email is already in use." |
| **Expired/Invalid JWT** | 401 Unauthorized | Automatically clear local storage/state and redirect the user to `/login`. Do not show an error if it happens on initial load, but do show an error toast if it happens mid-session. |

## 2. LiveKit & Connection Errors

| Scenario | Trigger / Event | Frontend Action |
| :--- | :--- | :--- |
| **Token Fetch Failed** | `/api/token` returns 500 or times out | Update UI state to `ERROR`. Display: "Failed to reach the server. Please try again later." |
| **LiveKit Connection Rejected** | `room.connect()` throws Error | Update UI state to `ERROR`. Display: "Failed to connect to the voice room." Log the specific LiveKit error message to the console. |
| **Connection Dropped (Mid-call)** | `RoomEvent.Disconnected` fires unexpectedly | Update UI state to `ERROR`. Display: "Connection lost. Please reconnect." Offer a prominent "Retry" button. |

## 3. Hardware / Permissions Errors

WebRTC requires explicit user permission to access the microphone.

| Scenario | Trigger / Event | Frontend Action |
| :--- | :--- | :--- |
| **Microphone Permission Denied** | `setMicrophoneEnabled(true)` throws `NotAllowedError` | Intercept the error. Update UI state to `ERROR`. Display a highly visible banner: "Microphone access denied. Please allow microphone access in your browser settings to use the voice agent." |
| **No Microphone Detected** | `setMicrophoneEnabled(true)` throws `NotFoundError` | Update UI state to `ERROR`. Display: "No microphone detected. Please plug in a microphone and try again." |

## 4. Pipeline Timeouts

Occasionally, the Pipecat pipeline on the backend might fail to boot or might crash during the warmup phase.

**Detection Mechanism:**
If the frontend enters the `WARMING_UP` state (LiveKit connected) but does not receive the `TrackSubscribed` event (Agent audio) within **10 seconds**, the frontend should assume the backend pipeline failed.

**Frontend Action:**
1. Call `room.disconnect()` to clean up.
2. Update UI state to `ERROR`.
3. Display: "The agent took too long to respond. Please try connecting again."

## 5. Graceful Degradation

- **Visualizer Fallback:** If the browser does not support the Web Audio API for advanced audio visualization, fallback to a CSS-only pseudo-random animation. Do not crash the app.
- **Mobile Browsers:** Ensure Safari on iOS is handled correctly (it requires user interaction to auto-play audio). The "Connect" button click satisfies this requirement, but ensure the `track.attach()` happens within that context.
