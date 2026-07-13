# 🎙️ Voice AI Agent — Setup & Testing Guide

This guide will walk you through running your Voice AI Agent and provide specific test phrases you can use to verify that all of the agent's capabilities (tools, memory, and reasoning) are working correctly.

---

## 🚀 How to Run the backend swagger Application

1. **Verify your API Keys**
   Ensure your `.env` file contains valid keys for all services:
   - MongoDB (MONGO_URI)
   - LiveKit (URL, API Key, API Secret)
   - Groq (Whisper STT)
   - Cartesia (Sonic TTS)
   - Cerebras (LLM)
   - Notion (API Key, Database ID) - *Optional, but required for the Notion tool*

2. **Start the Server**
   Open a PowerShell terminal in the project folder and run:
   ```powershell
   .\start.ps1
   ```
   *This starts the FastAPI server.*

3. **Authenticate via Swagger UI**
   - Open your web browser and go to: **[http://localhost:8000/docs](http://localhost:8000/docs)**
   - Under `POST /auth/signup`, sign up a new user (provide `name`, `email`, and `password`).
   - Click the green **Authorize** padlock button at the top of the page. Enter your email and password, then click Authorize and Close.
   - Scroll down to `POST /api/token`, click **Try it out**, and hit **Execute**.
   - Copy the `livekit_url` and the `token` string from the JSON response.

4. **Connect to the Test Client**
   - Open a new tab and go to: **[http://localhost:8000/test](http://localhost:8000/test)**
   - Paste the `LiveKit URL` and `LiveKit Token` you copied from Swagger into the input boxes.
   - Click **Connect to Agent**.
   - Wait 3-5 seconds for the agent to connect. Once it does, it will say "Hi, I'm ready!" and you can start talking.

5. **Verify Data in MongoDB**
   - Open your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
   - Go to your Cluster -> **Browse Collections** -> **voice_agent_db** -> **users**.
   - Find your user document and verify that the agent has recorded your entire conversation history in the `conversations` array!
   - Once you hear **"Hi, I'm ready!"** and see the green connected status, you can start speaking.

---

## 🧪 Testing Queries

To thoroughly test the agent, speak the following phrases clearly into your microphone. Pause after each phrase and let the agent respond.

### 1. Short Utterance & Greeting Test
*Verifies that the agent picks up single words and responds conversationally.*
> **You:** "Hello."
> **You:** "Hyderabad."

### 2. Conversational Memory Test
*Verifies that the agent remembers context from previous turns within the same session.*
> **You:** "Hi, my name is Alex and my favorite color is blue."
> *(Agent responds)*
> **You:** "Can you remind me what my name and favorite color are?"

### 3. Tool: Weather API
*Verifies the agent can fetch real-time data using the weather tool.*
> **You:** "What is the current weather in Tokyo?"

### 4. Tool: Calculator
*Verifies the agent can parse complex math and use the calculator tool instead of hallucinating math.*
> **You:** "Can you calculate 145 multiplied by 32?"
> **You:** "What is the square root of 65536?"

### 5. Tool: Web & News Search
*Verifies the agent can browse the live internet using DuckDuckGo.*
> **You:** "Search the web for a quick summary of the book 'Think Like a Monk'."
> **You:** "What is the latest news about the upcoming Olympics?"

### 6. Tool: Notion Notes (Read & Write)
*Verifies the agent can connect to your Notion database, save properties correctly, and retrieve them.*
> **You:** "Please take a note that my wifi password is 'voiceagent123'."
> *(Wait for confirmation)*
> **You:** "Can you search my notes and tell me what my wifi password is?"
> **You:** "Can you list my most recent notes?"

---

### 💡 Troubleshooting Tips
- **Agent doesn't hear you:** Check if your browser has microphone permissions enabled.
- **Agent reads out raw JSON:** This occasionally happens if the LLM gets confused. We've added a strict prompt to prevent it, but if it happens, just say *"Summarize that in English"* to course-correct.
- **Notion fails to save:** Ensure your Notion database has a title column named exactly **`Name`** and a Text column named exactly **`Content`**.
