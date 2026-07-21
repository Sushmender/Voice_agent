# Voice Agent — Frontend Testing Guide

This guide will walk you through starting the necessary services and manually testing the frontend features built up to **Day 2**.

---

## 1. Starting the Services

To test the frontend properly, you need the backend, the frontend development server, and the LiveKit server running simultaneously. Open separate terminal windows for each of the following commands.

### Terminal 1: LiveKit Server
The backend and frontend rely on LiveKit for WebRTC audio streaming.
```bash
# Start your local LiveKit server (if using livekit-cli)
livekit-server --dev
```
*(If you are using LiveKit Cloud, ensure your `.env` is configured with the correct Cloud URLs and keys).*

### Terminal 2: Backend (FastAPI)
The backend provides authentication routes and manages the AI agent logic.
```bash
# Stay in the project root directory (where both `.venv` and `backend` folders live).

# Windows (PowerShell):
.\.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# After activating the venv, start the FastAPI server from the root directory
uvicorn backend.main:app --reload --port 8000
```

### Terminal 3: Frontend (Vite)
The frontend serves the React application.
```bash
# Navigate to the frontend directory
cd frontend

# Start the Vite development server
npm run dev
```

---

## 2. Navigating the App (Where to go & What to enter)

Once all services are running, open your browser and follow these steps:

### A. Authentication Flow
1. **Navigate to:** `http://localhost:5173/login`
2. **Sign Up:**
   - Click the "Sign up" toggle (notice the smooth slide animation).
   - Enter a mock name, email, and password. 
   - Click submit. Upon successful signup, you should automatically be logged in and redirected.
3. **Form Validation (Optional Test):**
   - Try entering an invalid email format or submitting an empty form to see the validation errors appear instantly.

### B. The Console Layout
After logging in, you will be redirected to `http://localhost:5173/console`.

1. **Sidebar:** Look at the left panel. It should display your recent sessions grouped by date (Today, Yesterday, Earlier). Try expanding and collapsing the sidebar.
2. **Top Navigation Bar:** You should see your user avatar (initials) on the right and a dropdown menu to select different Voice IDs (Aria, Nova, Echo, Sage, Orion).

### C. The Voice Agent Core (The Orb Visualizer)
This is the centerpiece of the application, located in the middle panel.

1. **Initial State (Idle):**
   - **What to expect:** The Orb is dim and stationary. The Status Badge above it reads "Idle".
2. **Connecting:**
   - **Action:** Click the "Connect" or "Start Session" button.
   - **What to expect:** The badge changes to "Connecting". The Orb shows a conic sweep overlay and its rings start spinning.
3. **Warming Up:**
   - **What to expect:** The badge changes to "Warming Up". The Orb's core turns **amber**, and you will see amber audio bars. 
   - *(Note: If it stays here for over 10 seconds, it simulates a timeout error and will turn red and shake).*
4. **Connected & Listening:**
   - **What to expect:** The badge changes to "Listening". The Orb turns into a glowing **blue sphere**.
   - **Action:** Speak into your microphone.
   - **What to expect:** You should see amplitude-reactive audio bars bouncing in sync with your voice around the Orb.
5. **Agent Speaking:**
   - **What to expect:** When the AI processes your speech and replies, the Orb transitions to a **violet** gradient and emits two staggered ripple rings. The badge changes to "Speaking".
6. **Barge-in (Interruption):**
   - **Action:** While the agent is actively speaking (violet orb), try talking over it.
   - **What to expect:** The visualizer should immediately detect your voice and snap back to the blue "Listening" state.

---

## 3. Stopping the Services
When you are done testing, you can stop the servers in each terminal by pressing `Ctrl + C`.
