"""
backend/pipeline/voice_pipeline.py
------------------------------------
Pipecat voice pipeline wired to LiveKit transport  (pipecat 1.4.0)
-------------------------------------------------------------------
Architecture:
    LiveKit audio in
    → SileroVAD  (end-of-speech detection, stop_secs=0.8 s)
    → Groq Whisper STT  (whisper-large-v3-turbo, ~200-300 ms)
    → LatencyLoggerProcessor  (per-stage timing, passthrough)
    → LangGraphLLMService  (LangGraph graph: load_memory → llm_node
                            → [tool_node → format_tool_response →]? save_memory)
    → GreetingProcessor  (plays one-shot "Hi, I'm ready!" on connect)
    → Cartesia Sonic TTS  (streaming chunks, first chunk ~90 ms)
    → LiveKit audio out

Run as standalone:
    python -m backend.pipeline.voice_pipeline
"""
import asyncio
import logging
import os
import sys
import time

# Pipecat core
from pipecat.pipeline.pipeline import Pipeline
from pipecat.workers.runner import WorkerRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask, PipelineWorker

# Pipecat frames
from pipecat.frames.frames import (
    EndFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMMessagesAppendFrame,
    TextFrame,
    TranscriptionFrame,
)

# Pipecat processors
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.llm_service import LLMService

logger = logging.getLogger(__name__)


# Lazy wrapper so tests can patch 'backend.pipeline.voice_pipeline._run_agent_turn'
# without triggering the full agent import at module load time.
async def _run_agent_turn(session_id: str, user_text: str) -> str:
    """Thin wrapper around backend.agent.graph.run_agent_turn (imported lazily)."""
    from backend.agent.graph import run_agent_turn
    return await run_agent_turn(session_id=session_id, user_text=user_text)


# ── Greeting Processor ───────────────────────────────────────────────────────
class GreetingProcessor(FrameProcessor):
    """
    Plays a one-shot audio greeting ("Hi, I'm ready!") the first time a
    StartFrame arrives — i.e. exactly when the pipeline finishes connecting
    and is ready to listen.  After firing once it becomes a transparent
    pass-through for all subsequent frames.

    Placement in pipeline:
        ... → LangGraphLLMService → GreetingProcessor → CartesiaTTSService → ...

    The GreetingProcessor injects:
        LLMFullResponseStartFrame  (signals TTS to start streaming)
        TextFrame("Hi, I'm ready!")  (the greeting text to synthesise)
        LLMFullResponseEndFrame    (signals TTS to finish)
    These are forwarded *before* the StartFrame so TTS speaks immediately.
    """

    GREETING_TEXT = "Hi, I'm ready!"

    def __init__(self):
        super().__init__()
        self._greeted = False

    async def process_frame(self, frame: object, direction: FrameDirection):
        """Forward all frames; inject greeting once on the first StartFrame."""
        from pipecat.frames.frames import StartFrame
        await super().process_frame(frame, direction)

        if not self._greeted and isinstance(frame, StartFrame):
            self._greeted = True
            logger.info("[Greeting] Pipeline ready — sending audio greeting.")
            await self.push_frame(LLMFullResponseStartFrame())
            await self.push_frame(TextFrame(self.GREETING_TEXT))
            await self.push_frame(LLMFullResponseEndFrame())

        await self.push_frame(frame, direction)


# ── LangGraph LLM Processor (tool routing + session cleanup) ──────────
class LangGraphLLMService(LLMService):
    """
    LangGraph agent with MCP tool routing.

    On each LLMMessagesAppendFrame / TranscriptionFrame this processor:
      1. Extracts the latest user utterance.
      2. Filters silence / gibberish (< 2 words or empty).
      3. Calls run_agent_turn() which drives the full LangGraph pipeline:
             load_memory → llm_node → [tool_node → format_tool_response →]?
             save_memory
      4. Pushes the response as streaming TextFrames to Cartesia TTS.
      5. On EndFrame: clears short-term memory for this session.

    pipecat 1.4.0 note: Override process_frame() — not _process_frame.
    """

    # Minimum word count to treat as a valid utterance (avoids noise / breath)
    # Set to 1 so the agent can respond to single words like "Hello"
    _MIN_WORDS = 1

    def __init__(self, session_id: str = "default"):
        super().__init__()
        self._session_id = session_id
        self._call_count = 0

    async def process_frame(self, frame: object, direction: FrameDirection):
        """
        Intercept TranscriptionFrame / LLMMessagesAppendFrame and route through
        the LangGraph agent. Handle EndFrame for session cleanup.
        All other frames are forwarded unchanged.
        """
        await super().process_frame(frame, direction)

        # ── Session cleanup on disconnect ─────────────────────────────
        if isinstance(frame, EndFrame):
            logger.info(
                f"[LangGraphLLM] EndFrame received — clearing session '{self._session_id}'"
            )
            try:
                import backend.memory.short_term as _mem
                _mem.clear_session(self._session_id)
                logger.info(
                    f"[LangGraphLLM] Session '{self._session_id}' memory cleared."
                )
            except Exception as cleanup_err:
                logger.warning(
                    f"[LangGraphLLM] Session cleanup error: {cleanup_err}"
                )
            await self.push_frame(frame, direction)
            return

        # ── Extract user text ─────────────────────────────────────────
        user_text = ""
        if isinstance(frame, TranscriptionFrame):
            user_text = frame.text.strip()
        elif isinstance(frame, LLMMessagesAppendFrame):
            for msg in reversed(frame.messages):
                if isinstance(msg, dict) and msg.get("role") == "user":
                    user_text = msg.get("content", "").strip()
                    break
        else:
            # Forward all non-LLM/STT frames (StartFrame, audio, VAD events, etc.)
            await self.push_frame(frame, direction)
            return

        # ── Silence / gibberish filter ────────────────────────────────
        if not user_text:
            logger.debug(
                f"[LangGraphLLM] Turn #{self._call_count + 1}: empty transcript, skipping."
            )
            return

        word_count = len(user_text.split())
        if word_count < self._MIN_WORDS:
            logger.info(
                f"[LangGraphLLM] Short utterance ({word_count} word(s)): "
                f"'{user_text}' — skipping (min={self._MIN_WORDS})."
            )
            return

        self._call_count += 1

        logger.info(
            f"[LangGraphLLM] Turn #{self._call_count} | "
            f"Session '{self._session_id}' | User: '{user_text[:60]}'"
        )

        # ── Run LangGraph agent turn (with tool routing) ──────────────
        try:
            response_text = await _run_agent_turn(
                session_id=self._session_id,
                user_text=user_text,
            )
        except asyncio.TimeoutError:
            logger.error(
                f"[LangGraphLLM] Timeout on turn #{self._call_count} — "
                f"session '{self._session_id}'"
            )
            from backend.agent.prompts import TOOL_ERROR_MESSAGE
            response_text = "I'm sorry, that took too long. Please try again."
        except Exception as exc:
            logger.error(
                f"[LangGraphLLM] Agent error (turn #{self._call_count}): {exc}",
                exc_info=True,
            )
            from backend.agent.prompts import TOOL_ERROR_MESSAGE
            response_text = TOOL_ERROR_MESSAGE

        if not response_text:
            response_text = "I'm sorry, I didn't get a response. Could you repeat that?"

        logger.info(
            f"[LangGraphLLM] Turn #{self._call_count} | "
            f"Response: '{response_text[:80]}'"
        )

        # ── Stream response to TTS ────────────────────────────────────
        await self.push_frame(LLMFullResponseStartFrame())
        await self.push_frame(TextFrame(response_text))
        await self.push_frame(LLMFullResponseEndFrame())



# ── Main pipeline factory ─────────────────────────────────────────────────────
async def create_voice_pipeline(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    groq_api_key: str,
    cartesia_api_key: str,
    cartesia_voice_id: str,
    vad_analyzer=None,      # accept pre-warmed VAD from prewarm()
    session_id: str | None = None,  # session key for short-term memory
) -> PipelineWorker:
    """
    Build and return a Pipecat PipelineWorker wired to LiveKit transport.

    Pipeline stages:
        transport.input()       -> receive audio frames from LiveKit
        SileroVAD               -> end-of-speech detection (stop_secs=0.8)
        STT service             -> Groq Whisper whisper-large-v3-turbo
        LatencyLoggerProcessor  -> per-stage timing (passthrough)
        LLM service             -> LangGraphLLMService (Cerebras + memory)
        TTS service             -> Cartesia Sonic (streaming chunks)
        transport.output()      -> send synthesized audio back to LiveKit

    Args:
        livekit_url: wss:// URL of LiveKit cloud server.
        livekit_token: JWT participant token for the agent.
        room_name: Name of the LiveKit room to join.
        groq_api_key: Groq API key (for Whisper ASR).
        cartesia_api_key: Cartesia API key.
        cartesia_voice_id: Cartesia voice UUID.
        vad_analyzer: Optional pre-warmed SileroVADAnalyzer from prewarm().
        session_id: Session key used by short-term memory (defaults to room_name).

    Returns:
        Configured PipelineWorker ready to run.
    """
    # Import pipecat plugins (imported here so missing packages give clear errors)
    try:
        from pipecat.services.groq.stt import GroqSTTService
    except ImportError:
        raise ImportError(
            "pipecat-ai groq plugin not installed. "
            "Run: pip install 'pipecat-ai[groq]' groq"
        )

    try:
        from pipecat.services.cartesia.tts import CartesiaTTSService
    except ImportError:
        raise ImportError(
            "pipecat-ai cartesia plugin not installed. "
            "Run: pip install cartesia"
        )

    try:
        from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport
        from pipecat.audio.vad.silero import SileroVADAnalyzer
    except ImportError:
        raise ImportError(
            "pipecat-ai livekit/silero plugins not installed. "
            "Run: pip install 'pipecat-ai[livekit,silero]'"
        )

    # ── VAD ( tuned stop_secs for lower turn-end latency) ──────────────
    # stop_secs=0.8 means 800 ms of silence triggers end-of-speech.
    # Default is ~1.0 s; 0.8 s reduces perceived response lag noticeably.
    # Use pre-warmed analyzer from prewarm() if available (avoids model reload).
    if vad_analyzer is None:
        try:
            from pipecat.audio.vad.vad_analyzer import VADParams
            vad_analyzer = SileroVADAnalyzer(params=VADParams(stop_secs=0.8))
        except (ImportError, TypeError):
            # Older pipecat versions may not accept VADParams — fall back
            vad_analyzer = SileroVADAnalyzer()

    # ── Transport ─────────────────────────────────────────────────────────────
    # In pipecat 1.4.0, LiveKitTransport does not run VAD internally.
    # We set vad_enabled=False and audio_in_passthrough=True to let the transport
    # send raw audio frames downstream, which we then process using VADProcessor.
    transport = LiveKitTransport(
        url=livekit_url,
        token=livekit_token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=vad_analyzer,
            vad_audio_passthrough=True,
        ),
    )

    # ── VAD Processor (pipecat 1.4.0 standalone VAD stage) ───────────────────
    from pipecat.processors.audio.vad_processor import VADProcessor
    vad_processor = VADProcessor(vad_analyzer=vad_analyzer)

    # ── ASR (Groq Whisper - generous free tier, ~200-300ms) ───────────────────
    # NOTE: we include the real Groq Whisper STT - the LLM handles
    # responses instead of the real LangGraph agent.
    # Using pipecat 1.4.0 Settings API.
    stt = GroqSTTService(
        api_key=groq_api_key,
        settings=GroqSTTService.Settings(
            model="whisper-large-v3-turbo",   # fastest Groq Whisper model
            language="en",
        ),
    )

    # ── Latency Logger  (passthrough timing middleware) ────────────────
    from backend.pipeline.latency_logger import LatencyLoggerProcessor
    latency_logger = LatencyLoggerProcessor()

    # ── LLM (LangGraph agent — Cerebras + short-term memory) ───────────
    _session_id = session_id or room_name
    llm = LangGraphLLMService(session_id=_session_id)
    logger.info(f"[Pipeline] LangGraph agent initialised for session '{_session_id}'")

    # ── TTS (Cartesia Sonic) ──────────────────────────────────────────────────
    # CartesiaTTSService.Settings accepts: voice, model, language, generation_config.
    # Sample rate and encoding are init-level kwargs (not Settings fields).
    tts = CartesiaTTSService(
        api_key=cartesia_api_key,
        sample_rate=16000,       # PCM at 16kHz for LiveKit compatibility
        settings=CartesiaTTSService.Settings(
            voice=cartesia_voice_id,
            model="sonic-3.5",   # 'sonic' and 'sonic-english' were sunsetted in June 2026
        ),
    )

    # ── Greeting processor (fires once on connect) ───────────────────────────
    greeting = GreetingProcessor()

    # ── Pipeline ──────────────────────────────────────────────────────────────
    pipeline = Pipeline(
        [
            transport.input(),  # receive audio frames from LiveKit
            vad_processor,      # 🎙️ VAD: end-of-speech detection (Silero)
            stt,                # speech → text  (Groq Whisper)
            latency_logger,     # 📊 per-stage timing (passthrough)
            llm,                # text → response text (LangGraph + Cerebras)
            greeting,           # 🔔 one-shot "Hi, I'm ready!" on connect
            tts,                # response text → audio (Cartesia Sonic)
            transport.output(), # send audio frames back to LiveKit
        ]
    )

    # pipecat 1.4.0: use PipelineWorker (PipelineTask is deprecated).
    # PipelineParams passed as keyword arg (no positional).
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,        # log latency metrics per stage
        ),
    )

    return worker


async def run_pipeline(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    groq_api_key: str,
    cartesia_api_key: str,
    cartesia_voice_id: str,
    vad_analyzer=None,      #  forwarded from agent_worker prewarm()
    session_id: str | None = None,  # session key for short-term memory
):
    """Entry point to run the pipeline until the room is empty or an error occurs."""
    start_time = time.perf_counter()
    logger.info(f"Starting voice pipeline for room '{room_name}'...")

    worker = await create_voice_pipeline(
        livekit_url=livekit_url,
        livekit_token=livekit_token,
        room_name=room_name,
        groq_api_key=groq_api_key,
        cartesia_api_key=cartesia_api_key,
        cartesia_voice_id=cartesia_voice_id,
        vad_analyzer=vad_analyzer,
        session_id=session_id or room_name,
    )

    # pipecat 1.4.0: add_workers() + run() is the idiomatic pattern.
    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    try:
        await runner.run()
    finally:
        # Explicitly shut down all pipeline workers to prevent hangs on Ctrl+C
        await runner.cancel("shutdown")

    elapsed = time.perf_counter() - start_time
    logger.info(f"Pipeline for room '{room_name}' ended after {elapsed:.1f}s")


# ── Standalone test mode ──────────────────────────────────────────────────────
if __name__ == "__main__":
    """
    Run the echo pipeline directly (without the livekit-agents worker).
    Useful for quick testing.

    Usage:
        python -m backend.pipeline.voice_pipeline

    Requires .env to be configured with LiveKit, Groq, and Cartesia keys.
    """
    from dotenv import load_dotenv

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Validate required env vars
    required = [
        "LIVEKIT_URL", "GROQ_API_KEY", "CARTESIA_API_KEY",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your keys.")
        sys.exit(1)

    # For standalone mode, we need an agent token from our FastAPI server.
    # Start FastAPI first: uvicorn backend.main:app --port 8000
    import httpx

    async def main():
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://localhost:8000/api/agent/token",
                params={"room_name": os.getenv("LIVEKIT_ROOM_NAME", "voice-agent-room")},
            )
            resp.raise_for_status()
            data = resp.json()

        await run_pipeline(
            livekit_url=data["livekit_url"],
            livekit_token=data["token"],
            room_name=data["room_name"],
            groq_api_key=os.getenv("GROQ_API_KEY"),
            cartesia_api_key=os.getenv("CARTESIA_API_KEY"),
            cartesia_voice_id=os.getenv(
                "CARTESIA_VOICE_ID"
            ),
        )

    asyncio.run(main())
