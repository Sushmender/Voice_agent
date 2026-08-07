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
| **Frontend** | ✅ Complete (React + Vite, with Latency Tracking HUD & Warmup Flow) |

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
| **Cerebras** | Already have | https://cloud.cerebras.ai | `CEREBRAS_API_KEY` |
| **Notion** | Free workspace | https://notion.so/my-integrations | `NOTION_API_KEY` |

> [!TIP]
> Open-Meteo (weather) and DuckDuckGo (search) require **zero API keys** — they're fully public APIs.

---

## Repository Structure (Backend-focused)

```
voice_agent/
├── .env                         # Your actual keys (gitignored)
├── start.ps1                    # Startup script for FastAPI server
├── test_client.html             # Local testing UI (frontend)
├── requirements.txt             # All dependencies pinned
│
├── backend/
│   ├── main.py                  # FastAPI app: REST + pipeline launcher
│   ├── config.py                # Pydantic BaseSettings (reads .env)
│   ├── agent_worker.py          # LiveKit Agent entrypoint (auto-run by main)
│   │
│   ├── api/
│   │   ├── auth_routes.py       # FastAPI routes for signup, login, and profile
│   │   └── oauth_routes.py      # OAuth (Google/GitHub) endpoints
│   │
│   ├── auth/
│   │   ├── deps.py              # FastAPI dependencies (get_current_user)
│   │   └── security.py          # Password hashing and JWT generation
│   │
│   ├── db/
│   │   └── mongodb.py           # MongoDB connection lifecycle and client
│   │
│   ├── models/
│   │   └── user.py              # Pydantic schemas for User and TokenData
│   │
│   ├── pipeline/
│   │   ├── latency_logger.py    # Latency tracking utilities
│   │   ├── voice_pipeline.py    # Pipecat pipeline: VAD→Groq STT→Agent→Cartesia TTS
│   │   └── warmup.py            # Pre-warming logic for LLM & MCP connections
│   │
│   ├── agent/
│   │   ├── graph.py             # LangGraph StateGraph definition
│   │   ├── state.py             # AgentState TypedDict
│   │   ├── nodes.py             # node functions (memory, llm, tools, logging)
│   │   └── prompts.py           # System prompt
│   │
│   ├── memory/
│   │   └── short_term.py        # Session ConversationBufferMemory manager
│   │
│   ├── tools/
│   │   ├── weather.py           # Open-Meteo tool
│   │   ├── calculator.py        # Safe eval calculator
│   │   ├── web_search.py        # ddgs web and news search tool
│   │   └── notion_notes.py      # Notion API integration tool
│   │
│   └── mcp/
│       └── server.py            # FastMCP server for tools
│
├── tests/
│   ├── conftest.py              # Pytest fixtures
│   ├── test_agent_graph.py      # LangGraph routing tests
│   ├── test_session_memory.py   # Memory buffer tests
│   ├── test_settings.py         # Config/Env tests
│   └── test_voice_pipeline.py   # Voice pipeline stubs
│
└── docs/
    ├── Voice_agent-plan.md      # This project plan document
    ├── instructions.md          # End-to-end setup and testing guide
    ├── Executive Summary.pdf    # Executive overview
    └── frontend/                # Detailed frontend architecture docs
        ├── frontend_architecture.md
        ├── design_system.md
        ├── api_contract.md
        └── ...
```

---

## Day-by-Day Deliverable Summary

| Day | Deliverable | Testable Milestone |
|-----|-------------|-------------------|
| **Day 1** | Project scaffold, LiveKit connected, Pipecat echo stub | Browser joins LiveKit room, hears echo |
| **Day 2** | Full ASR + VAD + TTS pipeline | Speak → **Groq Whisper** transcript → Cartesia reads back |
| **Day 3** | LangGraph + Cerebras + short-term memory | Multi-turn conversation with name recall |
| **Day 4** | MCP tools (weather, calc, search, Notion) + full e2e test | All 5 demo scripts pass via voice |
| **Day 5** | Production React Frontend | Auth, Dashboard, DevMode Latency HUD, Post-login Warmup Flow |

> [!IMPORTANT]
> **Before Day 1 starts**: Sign up for **Groq** (https://console.groq.com), LiveKit Cloud, and Cartesia (all free), then add keys to `.env`.
> Also create a Notion integration token and a database for notes.
> **No Deepgram account needed.**
