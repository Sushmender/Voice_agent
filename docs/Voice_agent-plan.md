# Voice-Enabled Autonomous AI Assistant — Updated Implementation Plan
## (Groq Whisper ASR Edition)

## Confirmed Decisions (Updated)

| Component | Decision |
|---|---|
| **Audio Transport** | ✅ LiveKit (free cloud tier) + Pipecat pipeline |
| **ASR** | ✅ **Groq Whisper** (`whisper-large-v3-turbo`, generous free tier, ~200–300ms) |
| **TTS** | ✅ Cartesia Sonic (free trial, ~90ms, native LiveKit/Pipecat support) |
| **VAD** | ✅ Built into LiveKit Agents framework (Silero VAD under the hood — no CPU model to deploy) |
| **LLM** | ✅ Cerebras gpt-oss-120b via OpenAI-compatible API |
| **Short-term memory** | ✅ LangGraph state + LangChain ConversationBufferMemory |
| **Long-term memory** | ❌ Skip for now |
| **Embeddings** | ❌ Skip for now |
| **MCP Tools** | ✅ Weather (Open-Meteo), Calculator, Web Search (DuckDuckGo), Notion Notes |
| **Frontend** | ⏳ After backend is complete |

> [!IMPORTANT]
> **ASR Changed**: Deepgram Nova-3 → **Groq Whisper** (`whisper-large-v3-turbo`).
> Groq's free tier gives **14,400 audio minutes/day** — far more generous than Deepgram's $200 one-time credit.
> Replace `DEEPGRAM_API_KEY` in `.env` with `GROQ_API_KEY` from https://console.groq.com.

---

## Why Groq Whisper over Deepgram?

| Criteria | Deepgram Nova-3 | Groq Whisper |
|---|---|---|
| **Free tier** | $200 one-time credit | 14,400 min/day recurring free |
| **Latency** | ~250ms (streaming) | ~200–300ms (batch, fast inference) |
| **Model** | Proprietary Nova-3 | OpenAI Whisper Large v3 Turbo |
| **API style** | REST/WebSocket | REST (Groq Cloud) |
| **SDK** | `deepgram-sdk` | `groq` Python SDK |
| **Pipecat support** | `pipecat.services.deepgram.stt` | `pipecat.services.groq.stt` |
| **No CC required** | ✅ | ✅ |

> [!TIP]
> `whisper-large-v3-turbo` is Groq's fastest Whisper model — optimised on Groq's LPU hardware for ultra-low latency transcription.

---

## Architecture Overview

```
Browser (voice)
    │ WebRTC
    ▼
LiveKit Cloud (free tier, WebRTC server)
    │ audio frames
    ▼
LiveKit Agent Worker (Python process, your machine/server)
    │
    ├── VAD → built-in (silero inside livekit-agents, no manual deploy)
    ├── ASR → Groq Whisper whisper-large-v3-turbo (generous free tier)
    │             ↓ transcript
    ├── LangGraph Orchestrator (Cerebras gpt-oss-120b)
    │     ├── Short-term Memory (LangGraph State)
    │     └── MCP Tool Router
    │           ├── Weather Tool (Open-Meteo — no key)
    │           ├── Calculator Tool (safe Python eval)
    │           ├── Web Search Tool (DuckDuckGo — no key)
    │           └── Notion Notes MCP (Notion API — free)
    │             ↓ response text
    └── TTS → Cartesia Sonic (~90ms, free trial)
                 ↓ audio frames
    LiveKit → Browser (audio out)
```

### Latency Budget (with Groq Whisper)

| Stage | Time |
|---|---|
| VAD end-of-speech detection | ~10ms |
| **Groq Whisper ASR** | **~200–300ms** |
| LangGraph dispatch + Cerebras LLM | ~80–150ms |
| MCP tool call (if triggered) | +50–200ms |
| Cartesia TTS (first chunk) | ~90ms |
| LiveKit audio delivery | ~20ms |
| **Total (no tool call)** | **~400–570ms** |
| **Total (with tool call)** | **~550–770ms** |

> [!NOTE]
> Groq's LPU hardware accelerates Whisper inference significantly — expect consistent sub-300ms transcription even on longer utterances.

---

## API Keys You Need (All Free)

| Service | Free Tier | Signup URL | Key Name in `.env` |
|---|---|---|---|
| **LiveKit Cloud** | Free (2 rooms, 100 min/day) | https://cloud.livekit.io | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| **Groq** | 14,400 audio min/day free | https://console.groq.com | `GROQ_API_KEY` |
| **Cartesia** | Free trial | https://cartesia.ai | `CARTESIA_API_KEY` |
| **Cerebras** | Already have | — | `CEREBRAS_API_KEY` |
| **Notion** | Free workspace | https://notion.so/my-integrations | `NOTION_API_KEY` |

> [!TIP]
> Open-Meteo (weather) and DuckDuckGo (search) require **zero API keys** — they're fully public APIs.

---

## Repository Structure (Backend-focused)

```
voice_agent/
├── .env                         # Your actual keys (gitignored)
├── .env.example                 # Template to commit
├── .gitignore
├── requirements.txt             # All dependencies pinned
├── README.md
│
├── backend/
│   ├── main.py                  # FastAPI app: REST + agent worker launcher
│   ├── config.py                # Pydantic BaseSettings (reads .env)
│   │
│   ├── agent_worker.py          # LiveKit Agent entrypoint (livekit-agents)
│   │
│   ├── pipeline/
│   │   ├── __init__.py
│   │   └── voice_pipeline.py    # Pipecat pipeline: VAD→Groq Whisper STT→Agent→TTS
│   │
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── graph.py             # LangGraph StateGraph definition
│   │   ├── state.py             # AgentState TypedDict
│   │   ├── nodes.py             # node functions (memory_load, llm, tool_exec, memory_save)
│   │   └── prompts.py           # System prompt
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   └── short_term.py        # Session ConversationBufferMemory manager
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── weather.py           # Open-Meteo tool
│   │   ├── calculator.py        # Safe eval calculator
│   │   ├── web_search.py        # DuckDuckGo search
│   │   └── notion_notes.py      # Notion MCP tool
│   │
│   └── mcp/
│       ├── __init__.py
│       └── server.py            # FastMCP server (wraps tools as MCP endpoints)
│
├── tests/
│   ├── conftest.py
│   ├── test_config.py
│   ├── test_tools.py
│   ├── test_agent.py
│   ├── test_memory.py
│   └── test_pipeline.py
│
└── docs/
    └── architecture.md
```

---

## 4-Day Backend Plan

---

### Day 1 — Foundation, Config, LiveKit + Pipecat Skeleton

**Goal**: Get LiveKit agent worker running, connecting to LiveKit Cloud, with a dummy pipeline. Prove the plumbing works before adding AI.

**Tasks**:
- [x] Create project structure, `.gitignore`, `.env.example`
- [x] Write `requirements.txt` with pinned versions (includes `groq>=0.9.0`)
- [x] Write `backend/config.py` (Pydantic BaseSettings — uses `GROQ_API_KEY`)
- [x] Write `backend/main.py` (FastAPI app: health check, token generation endpoint)
- [x] Write `backend/agent_worker.py` (LiveKit Agent entrypoint, registers with LiveKit Cloud)
- [x] Write `backend/pipeline/voice_pipeline.py` (Pipecat stub — echo pipeline: ASR text → TTS)
- [ ] Test: `python backend/agent_worker.py` connects to LiveKit Cloud ✅
- [ ] Test: LiveKit test client (browser) can join room and hear echo ✅

**Key files**: `config.py`, `main.py`, `agent_worker.py`, `requirements.txt`

**Packages**: `livekit-agents`, `pipecat-ai[silero,groq]`, `groq`, `livekit-plugins-cartesia`, `fastapi`, `uvicorn`, `python-dotenv`, `pydantic-settings`

---

### Day 2 — ASR + TTS + VAD Full Voice Pipeline

**Goal**: Complete voice pipeline. User speaks → Groq Whisper transcribes → Cartesia speaks back a canned response. Measure latency per stage.

**Tasks**:
- [ ] Integrate **Groq Whisper** (`whisper-large-v3-turbo`) ASR in Pipecat pipeline (via `GroqSTTService`)
- [ ] Integrate **Cartesia Sonic** TTS in Pipecat pipeline (streaming audio chunks)
- [ ] Verify **VAD** is working (livekit-agents built-in — `silero_vad` end-of-turn detection)
- [ ] Add **latency logging middleware** (timestamp at: audio-end, transcript-ready, tts-first-chunk, tts-done)
- [ ] Measure and log latency breakdown per turn
- [ ] Write `tests/test_pipeline.py` (feed pre-recorded WAV → check transcript output)
- [ ] Test: Full voice loop works — speak "hello" → hear "hello" back ✅
- [ ] Test: Latency log shows ASR ~200–300ms, TTS first chunk ~90ms ✅

**Key files**: `voice_pipeline.py` (complete), `tests/test_pipeline.py`

**Packages**: `groq`, `cartesia`, `pipecat-ai[groq,cartesia,silero]`

---

### Day 3 — LangGraph Agent + Cerebras + Short-term Memory

**Goal**: Replace the canned echo with a real LangGraph agent powered by Cerebras. Multi-turn conversation with memory working.

**Tasks**:
- [ ] Write `backend/agent/state.py` (AgentState TypedDict)
- [ ] Write `backend/agent/prompts.py` (voice-optimized system prompt — brief, conversational)
- [ ] Write `backend/agent/nodes.py`:
  - `load_memory_node` — loads session chat history into state
  - `llm_node` — calls Cerebras gpt-oss-120b with LangGraph
  - `save_memory_node` — saves turn to session memory
- [ ] Write `backend/agent/graph.py` (StateGraph: load_memory → llm → save_memory → END)
- [ ] Write `backend/memory/short_term.py` (session keyed ConversationBufferMemory, maxlen=20)
- [ ] Wire LangGraph agent into `voice_pipeline.py` (replace canned echo with agent call)
- [ ] Write `tests/test_agent.py` (mock ASR input → check agent responds coherently)
- [ ] Write `tests/test_memory.py` (assert memory persists across turns in same session)
- [ ] Test: "My name is Alice" → follow-up "What's my name?" → agent says "Alice" ✅
- [ ] Test: Multi-turn context maintained over 5+ turns ✅

**Key files**: `agent/graph.py`, `agent/nodes.py`, `agent/state.py`, `memory/short_term.py`

**Packages**: `openai>=1.35.0` (Cerebras OpenAI-compatible), `langgraph`, `langchain-core`, `langchain`

---

### Day 4 — MCP Tools + Notion + Full End-to-End Testing

**Goal**: Agent uses tools. Weather, calculator, search, and Notion notes all callable from the LangGraph agent via function/tool calling. Full end-to-end test with real speech.

**Tasks**:
- [ ] Write `backend/tools/weather.py` (Open-Meteo API, geocoding + current weather, **no API key**)
- [ ] Write `backend/tools/calculator.py` (AST-safe eval, handles math expressions)
- [ ] Write `backend/tools/web_search.py` (DuckDuckGo `duckduckgo-search` library, **no API key**)
- [ ] Write `backend/tools/notion_notes.py` (Notion API: create page, search pages)
- [ ] Write `backend/mcp/server.py` (FastMCP server exposing all 4 tools as MCP endpoints)
- [ ] Update `agent/nodes.py` — bind tools to LangGraph via `bind_tools()`, add `tool_node`
- [ ] Update `agent/graph.py` — add conditional edge: if tool_call → tool_node → llm, else → END
- [ ] Write `tests/test_tools.py` (unit test each tool function independently)
- [ ] **End-to-end voice tests**:
  - "What's the weather in Paris?" → tool call → agent speaks weather ✅
  - "Calculate 13 times 19" → calculator → agent says "247" ✅
  - "Search for the latest AI news" → DDG search → summarized response ✅
  - "Save a note: I need to buy milk" → Notion page created ✅
  - "What notes have I saved?" → Notion search → agent reads back ✅
- [ ] Performance profiling: log all stage latencies for 10 turns, confirm p50 acceptable ✅
- [ ] Clean up: error handling, graceful fallbacks, session cleanup on disconnect

**Key files**: `tools/*.py`, `mcp/server.py`, `agent/graph.py` (updated), `tests/test_tools.py`

**Packages**: `fastmcp`, `duckduckgo-search`, `notion-client`, `httpx`

---

## Milestone Checklist (End of Day 4)

- [ ] LiveKit agent connects to cloud, handles room join/leave
- [ ] VAD detects end-of-speech correctly
- [ ] **Groq Whisper** transcribes speech with <10% WER on clear speech
- [ ] Cerebras LLM responds correctly to text queries
- [ ] Multi-turn memory works (5+ turns, recall names/facts)
- [ ] All 4 MCP tools callable and returning correct results
- [ ] Notion note save and recall works
- [ ] End-to-end voice → transcript → agent → TTS → voice works
- [ ] Latency logged per stage
- [ ] All tests passing: `pytest tests/ -v`

---

## Full `requirements.txt`

```txt
# LiveKit (WebRTC transport + agent worker framework)
livekit>=0.17.0
livekit-agents>=0.11.0
livekit-plugins-cartesia>=0.4.0
livekit-plugins-silero>=0.6.0

# Pipecat (voice pipeline framework)
pipecat-ai[silero,groq]>=0.0.50

# Groq (Whisper ASR — generous free tier)
groq>=0.9.0

# FastAPI
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.9

# LangGraph + LangChain
langgraph>=0.1.19
langchain>=0.2.6
langchain-core>=0.2.10
langchain-community>=0.2.0

# Cerebras (OpenAI-compatible API)
openai>=1.35.0

# MCP Tools
duckduckgo-search>=6.2.0
notion-client>=2.2.1
httpx>=0.27.0
fastmcp>=0.2.0

# Config & Utilities
python-dotenv>=1.0.0
pydantic>=2.7.0
pydantic-settings>=2.3.0

# Testing
pytest>=8.2.0
pytest-asyncio>=0.23.0
pytest-mock>=3.14.0
```

---

## `.env.example`

```bash
# Cerebras
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=gpt-oss-120b

# LiveKit Cloud (https://cloud.livekit.io — free tier)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq Whisper ASR (https://console.groq.com — 14,400 min/day free)
GROQ_API_KEY=your_groq_api_key_here

# Cartesia (https://cartesia.ai — free trial)
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=694f9389-aac1-45b6-b726-9d9369183238

# Notion (https://notion.so/my-integrations — free)
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App config
APP_HOST=0.0.0.0
APP_PORT=8000
LOG_LEVEL=INFO
MAX_SESSION_HISTORY=20

# LiveKit room settings
LIVEKIT_ROOM_NAME=voice-agent-room
AGENT_PARTICIPANT_IDENTITY=voice-agent-bot
```

---

## Day-by-Day Deliverable Summary

| Day | Deliverable | Testable Milestone |
|-----|-------------|-------------------|
| **Day 1** | Project scaffold, LiveKit connected, Pipecat echo stub | Browser joins LiveKit room, hears echo |
| **Day 2** | Full ASR + VAD + TTS pipeline | Speak → **Groq Whisper** transcript → Cartesia reads back |
| **Day 3** | LangGraph + Cerebras + short-term memory | Multi-turn conversation with name recall |
| **Day 4** | MCP tools (weather, calc, search, Notion) + full e2e test | All 5 demo scripts pass via voice |

> [!IMPORTANT]
> **Before Day 1 starts**: Sign up for **Groq** (https://console.groq.com), LiveKit Cloud, and Cartesia (all free), then add keys to `.env`.
> Also create a Notion integration token and a database for notes.
> **No Deepgram account needed.**
