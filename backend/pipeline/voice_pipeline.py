"""
backend/pipeline/voice_pipeline.py
------------------------------------
Pipecat voice pipeline wired to LiveKit transport  (pipecat 1.4.0)
-------------------------------------------------------------------
Architecture:
    LiveKit audio in
    → SileroVAD  (end-of-speech detection, stop_secs=0.8 s)
    → InterruptionHandlerProcessor  (barge-in: user speech during bot speech
                                     → broadcast InterruptionFrame → Cartesia stops)
    → Groq Whisper STT  (whisper-large-v3-turbo, ~200-300 ms)
    → LatencyLoggerProcessor  (per-stage timing, passthrough)
    → LangGraphLLMService  (LangGraph graph: load_memory → llm_node
                            → [tool_node → format_tool_response →]? save_memory)
    → GreetingProcessor  (plays one-shot "Hi, I'm ready!" on connect)
    → Cartesia Sonic TTS  (streaming chunks, first chunk ~90 ms)
    → LiveKit audio out

Interruption (barge-in) flow:
    User speaks while bot is talking
    → VADProcessor emits VADUserStartedSpeakingFrame
    → InterruptionHandlerProcessor detects bot_is_speaking=True
    → calls broadcast_interruption()
    → InterruptionFrame propagates downstream
    → CartesiaTTSService.on_audio_context_interrupted() → stops Cartesia stream
    → LangGraphLLMService._start_interruption() → cancels current asyncio task
    → Bot stops immediately; pipeline ready for next utterance

DataChannel events (for frontend):
    - { type: "transcript", role: "user",  text: "...", timestamp: ... }
    - { type: "transcript", role: "agent", text: "...", timestamp: ... }
    - { type: "tool_event", name: "get_weather", status: "running"|"success", ... }

Run as standalone:
    python -m backend.pipeline.voice_pipeline
"""
import asyncio
import json
import logging
import os
import re
import sys
import time

# Pipecat core
from pipecat.pipeline.pipeline import Pipeline
from pipecat.workers.runner import WorkerRunner
from pipecat.pipeline.task import PipelineParams, PipelineWorker

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
async def _run_agent_turn(
    session_id: str,
    user_text: str,
    user_name: str = "User",
    user_id: str = "",
) -> dict:
    """Thin wrapper around backend.agent.graph.run_agent_turn (imported lazily).
    
    Returns:
        dict: { "response": str, "tool_name": str, "tool_output": str }
    """
    from backend.agent.graph import run_agent_turn
    return await run_agent_turn(
        session_id=session_id,
        user_text=user_text,
        user_name=user_name,
        user_id=user_id,
    )


# ── Greeting Processor ───────────────────────────────────────────────────────
class GreetingProcessor(FrameProcessor):
    """
    Plays a one-shot audio greeting ("Hi, I'm ready!") the first time a
    ClientConnectedFrame arrives — i.e. exactly when the pipeline finishes
    connecting and is ready to listen.  After firing once it becomes a
    transparent pass-through for all subsequent frames.

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
        """Forward all frames; inject greeting once on the first ClientConnectedFrame."""
        from pipecat.frames.frames import ClientConnectedFrame
        await super().process_frame(frame, direction)

        if not self._greeted and isinstance(frame, ClientConnectedFrame):
            self._greeted = True
            logger.info("[Greeting] Pipeline ready — sending audio greeting.")
            await self.push_frame(LLMFullResponseStartFrame())
            await self.push_frame(TextFrame(self.GREETING_TEXT))
            await self.push_frame(LLMFullResponseEndFrame())

        await self.push_frame(frame, direction)


# ── Interruption Handler Processor ───────────────────────────────────────────
class InterruptionHandlerProcessor(FrameProcessor):
    """
    Barge-in / interruption detection for voice conversations.

    Tracks whether the bot is currently speaking by listening to
    BotStartedSpeakingFrame / BotStoppedSpeakingFrame emitted by Cartesia TTS.

    When the user starts speaking WHILE the bot is speaking:
        → calls broadcast_interruption() which pushes InterruptionFrame
          both upstream and downstream through the entire pipeline.
        → Cartesia TTS receives InterruptionFrame → stops mid-stream immediately.
        → LangGraphLLMService receives InterruptionFrame → cancels running task.
        → Pipeline is clean and ready for the next user utterance.

    When the user starts speaking WHILE the bot is silent:
        → passes through normally (new conversation turn).

    Speakers / Echo Note:
        Since the user demos with speakers, LiveKit's browser-side echo
        cancellation (AEC) should filter most feedback before it reaches VAD.
        An additional _echo_protection_secs grace period (200 ms) after bot
        starts speaking prevents any residual echo from triggering a false
        interruption at the very start of the bot's response.

    Placement in pipeline:
        transport.input() → vad_processor → [THIS] → stt → latency_logger → llm → ...
    """

    # Seconds after bot starts speaking before interruption detection is active.
    # Prevents the very first audio burst from triggering a false self-interrupt
    # on speaker setups where echo cancellation takes a moment to engage.
    _ECHO_PROTECTION_SECS: float = 0.2

    def __init__(self):
        super().__init__()
        self._bot_is_speaking: bool = False
        self._bot_speech_start_ts: float = 0.0

    async def process_frame(self, frame: object, direction: FrameDirection):
        await super().process_frame(frame, direction)

        from pipecat.frames.frames import (
            BotStartedSpeakingFrame,
            BotStoppedSpeakingFrame,
            VADUserStartedSpeakingFrame,
        )

        # Track bot speaking state (Cartesia TTS emits these automatically)
        if isinstance(frame, BotStartedSpeakingFrame):
            self._bot_is_speaking = True
            self._bot_speech_start_ts = time.perf_counter()
            logger.debug("[Interruption] Bot started speaking — interruption detection armed")

        elif isinstance(frame, BotStoppedSpeakingFrame):
            self._bot_is_speaking = False
            logger.debug("[Interruption] Bot stopped speaking — interruption detection disarmed")

        # Key logic: user speaks while bot is speaking → barge-in!
        elif isinstance(frame, VADUserStartedSpeakingFrame):
            if self._bot_is_speaking:
                elapsed = time.perf_counter() - self._bot_speech_start_ts
                if elapsed < self._ECHO_PROTECTION_SECS:
                    # Too soon after bot started — likely speaker echo, ignore.
                    logger.debug(
                        f"[Interruption] VAD fired {elapsed*1000:.0f}ms after bot started "
                        f"— within echo-protection window, ignoring."
                    )
                else:
                    # Real user interruption — broadcast to the whole pipeline.
                    logger.info(
                        f"[Interruption] 🚨 User interrupted bot after "
                        f"{elapsed*1000:.0f}ms — broadcasting InterruptionFrame"
                    )
                    self._bot_is_speaking = False
                    await self.broadcast_interruption()
                    # Do NOT forward the VADUserStartedSpeakingFrame here —
                    # the InterruptionFrame has already cleared the pipeline.
                    # VAD will re-emit a fresh VADUserStartedSpeakingFrame for
                    # the actual user speech once the pipeline resets.
                    return
            # else: bot was silent — normal new turn, fall through to push_frame

        await self.push_frame(frame, direction)


# ── Bot Speaking Tracker Processor ───────────────────────────────────────────
class BotSpeakingTracker(FrameProcessor):
    """
    Sits right before transport.output() to securely track when TTS starts/stops
    playing, because BotStartedSpeakingFrame can be swallowed as it flows upstream.
    Feeds state directly into the InterruptionHandlerProcessor.
    """
    def __init__(self, interruption_handler: InterruptionHandlerProcessor):
        super().__init__()
        self._handler = interruption_handler

    async def process_frame(self, frame: object, direction: FrameDirection):
        await super().process_frame(frame, direction)

        from pipecat.frames.frames import BotStartedSpeakingFrame, BotStoppedSpeakingFrame
        if isinstance(frame, BotStartedSpeakingFrame):
            self._handler._bot_is_speaking = True
            self._handler._bot_speech_start_ts = time.perf_counter()
            logger.debug("[Tracker] TTS audio started playing.")
        elif isinstance(frame, BotStoppedSpeakingFrame):
            self._handler._bot_is_speaking = False
            logger.debug("[Tracker] TTS audio stopped playing.")
            
        await self.push_frame(frame, direction)


# ── LangGraph LLM Processor (tool routing + session cleanup) ──────────
class LangGraphLLMService(LLMService):
    """
    LangGraph agent with MCP tool routing and DataChannel event emission.

    On each TranscriptionFrame / LLMMessagesAppendFrame this processor:
      1. Extracts the latest user utterance.
      2. Filters silence / gibberish (< 1 word or empty).
      3. Emits { type: "transcript", role: "user", text } over LiveKit DataChannel.
      4. Calls run_agent_turn() which drives the full LangGraph pipeline:
             load_memory → llm_node → [tool_node → format_tool_response →]?
             save_memory
      5. Emits { type: "tool_event", name, status } if a tool was called.
      6. Emits { type: "transcript", role: "agent", text } over DataChannel.
      7. Pushes the response as sentence-chunked TextFrames to Cartesia TTS
         (gives faster first audio — Cartesia starts on the first sentence).
      8. On asyncio.CancelledError (user interrupted): logs and re-raises cleanly.
      9. On EndFrame: clears short-term memory for this session.

    pipecat 1.4.0 note: Override process_frame() — not _process_frame.
    """

    # Minimum word count to treat as a valid utterance (avoids noise / breath)
    _MIN_WORDS = 1

    def __init__(
        self,
        session_id: str = "default",
        user_name: str = "User",
        user_id: str = "",
        transport=None,  # LiveKitTransport — for DataChannel send_message
    ):
        super().__init__()
        self._session_id = session_id
        self._user_name = user_name
        self._user_id = user_id
        self._transport = transport  # may be None if DataChannel not needed
        self._call_count = 0
        self._was_interrupted = False

    # ── DataChannel helper ────────────────────────────────────────────────────
    async def _emit_dc(self, data: dict) -> None:
        """Send a JSON event over the LiveKit DataChannel (best-effort, non-fatal)."""
        if self._transport is None:
            return
        try:
            payload = json.dumps(data)
            await self._transport.send_message(payload)
        except Exception as exc:
            logger.warning(f"[DataChannel] Failed to emit event: {exc}")

    # ── Frame processing ──────────────────────────────────────────────────────
    async def process_frame(self, frame: object, direction: FrameDirection):
        """
        Intercept TranscriptionFrame / LLMMessagesAppendFrame and route through
        the LangGraph agent. Handle EndFrame for session cleanup.
        Handles asyncio.CancelledError gracefully on user interruption.
        All other frames are forwarded unchanged.
        """
        await super().process_frame(frame, direction)

        from pipecat.frames.frames import InterruptionFrame
        # ── Track interruption ────────────────────────────────────────
        if isinstance(frame, InterruptionFrame):
            logger.info("[LangGraphLLM] Received InterruptionFrame — preparing graceful continuation.")
            self._was_interrupted = True
            await self.push_frame(frame, direction)
            return

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

        # ── Graceful Interruption Continuation ────────────────────────
        if self._was_interrupted:
            logger.info("[LangGraphLLM] Turn follows an interruption — prepending system note.")
            user_text = (
                "[System Note: The user interrupted your previous response. "
                "Acknowledge the interruption naturally with a short continuation word "
                "(e.g., 'Gotcha', 'Sure', 'My bad', 'Alright'), and then address their new input.]\n\n"
                f"User: {user_text}"
            )
            self._was_interrupted = False

        self._call_count += 1

        logger.info(
            f"[LangGraphLLM] Turn #{self._call_count} | "
            f"Session '{self._session_id}' | User: '{user_text[:60]}'"
        )

        # ── Emit user transcript over DataChannel ─────────────────────
        await self._emit_dc({
            "type": "transcript",
            "role": "user",
            "text": user_text,
            "timestamp": time.time(),
            "turn": self._call_count,
        })

        # ── Run LangGraph agent turn (with tool routing) ──────────────
        result: dict = {}
        try:
            result = await _run_agent_turn(
                session_id=self._session_id,
                user_text=user_text,
                user_name=self._user_name,
                user_id=self._user_id,
            )
        except asyncio.CancelledError:
            # User interrupted mid-turn — clean exit, no memory save (per design).
            logger.info(
                f"[LangGraphLLM] Turn #{self._call_count} cancelled by user interruption. "
                f"Discarding partial response."
            )
            raise  # Must re-raise so pipecat knows the task was cancelled cleanly
        except asyncio.TimeoutError:
            logger.error(
                f"[LangGraphLLM] Timeout on turn #{self._call_count} — "
                f"session '{self._session_id}'"
            )
            result = {"response": "I'm sorry, that took too long. Please try again.", "tool_name": "", "tool_output": ""}
        except Exception as exc:
            logger.error(
                f"[LangGraphLLM] Agent error (turn #{self._call_count}): {exc}",
                exc_info=True,
            )
            from backend.agent.prompts import TOOL_ERROR_MESSAGE
            result = {"response": TOOL_ERROR_MESSAGE, "tool_name": "", "tool_output": ""}

        response_text: str = result.get("response", "") or ""
        tool_name: str = result.get("tool_name", "") or ""
        tool_output: str = result.get("tool_output", "") or ""

        if not response_text:
            response_text = "I'm sorry, I didn't get a response. Could you repeat that?"

        logger.info(
            f"[LangGraphLLM] Turn #{self._call_count} | "
            f"Response: '{response_text[:80]}'"
        )

        # ── Emit tool event over DataChannel (if a tool was used) ─────
        if tool_name:
            await self._emit_dc({
                "type": "tool_event",
                "name": tool_name,
                "status": "success",
                "output_preview": tool_output[:120] if tool_output else "",
                "timestamp": time.time(),
                "turn": self._call_count,
            })

        # ── Emit agent transcript over DataChannel ────────────────────
        await self._emit_dc({
            "type": "transcript",
            "role": "agent",
            "text": response_text,
            "timestamp": time.time(),
            "turn": self._call_count,
            "tool_used": tool_name or None,
        })

        # ── Stream response to TTS (sentence-chunked for faster first audio) ──
        # Split on sentence boundaries so Cartesia starts synthesising the first
        # sentence immediately (~90 ms TTFB) while the rest queues behind it.
        cleaned_text = _clean_text_for_tts(response_text)
        sentences = _split_into_sentences(cleaned_text)

        await self.push_frame(LLMFullResponseStartFrame())
        for sentence in sentences:
            if sentence.strip():
                # Append a space so Cartesia's internal aggregator doesn't
                # glue sentences together (e.g., "Hello!How are you?") which
                # causes the TTS to misread punctuation marks.
                await self.push_frame(TextFrame(sentence.strip() + " "))
        await self.push_frame(LLMFullResponseEndFrame())


def _clean_text_for_tts(text: str) -> str:
    """Strip markdown and special characters that TTS might read aloud."""
    if not text:
        return ""
    # Remove markdown bold/italics
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    # Remove inline code backticks
    text = re.sub(r'`(.*?)`', r'\1', text)
    # Remove markdown headings
    text = re.sub(r'#+\s*', '', text)
    # Remove any standalone brackets or weird punctuation (optional, keeping it light)
    return text.strip()

def _split_into_sentences(text: str) -> list[str]:
    """
    Split response text into natural sentence chunks for TTS pipelining.

    Uses a simple regex that splits on '.', '?', '!' followed by whitespace
    or end-of-string. Preserves the trailing punctuation on each sentence.

    Example:
        "Hello! How are you? I'm fine." → ["Hello!", "How are you?", "I'm fine."]
    """
    if not text:
        return []
    # Split while keeping the delimiter attached to the preceding sentence
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    # Filter out any empty strings
    return [p for p in parts if p.strip()]


# ── Main pipeline factory ─────────────────────────────────────────────────────
async def create_voice_pipeline(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    groq_api_key: str,
    cartesia_api_key: str,
    cartesia_voice_id: str,
    user_name: str = "User",
    user_id: str = "",
    vad_analyzer=None,      # accept pre-warmed VAD from prewarm()
    session_id: str | None = None,  # session key for short-term memory
) -> PipelineWorker:
    """
    Build and return a Pipecat PipelineWorker wired to LiveKit transport.

    Pipeline stages:
        transport.input()           → receive audio frames from LiveKit
        SileroVAD                   → end-of-speech detection (stop_secs=0.8)
        InterruptionHandlerProcessor→ barge-in: user speech during bot speech
                                       → InterruptionFrame → Cartesia stops
        STT service                 → Groq Whisper whisper-large-v3-turbo
        LatencyLoggerProcessor      → per-stage timing (passthrough)
        LLM service                 → LangGraphLLMService (Cerebras + memory)
        TTS service                 → Cartesia Sonic (streaming chunks)
        transport.output()          → send synthesized audio back to LiveKit

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

    # ── Interruption Handler (barge-in detection) ─────────────────────────────
    # Must sit BETWEEN vad_processor and stt so InterruptionFrame propagates
    # downstream to LLM and Cartesia BEFORE the new transcript arrives.
    interruption_handler = InterruptionHandlerProcessor()

    # ── ASR (Groq Whisper - generous free tier, ~200-300ms) ───────────────────
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
    llm = LangGraphLLMService(
        session_id=_session_id,
        user_name=user_name,
        user_id=user_id,
        transport=transport,  # passed for DataChannel event emission
    )
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

    # ── Bot Speaking Tracker (observes right before output) ──────────────────
    tracker = BotSpeakingTracker(interruption_handler)

    # ── Pipeline ──────────────────────────────────────────────────────────────
    pipeline = Pipeline(
        [
            transport.input(),      # receive audio frames from LiveKit
            vad_processor,          # 🎙️ VAD: end-of-speech detection (Silero)
            interruption_handler,   # 🚨 barge-in: user speech mid-bot-speech → interrupt
            stt,                    # speech → text  (Groq Whisper)
            latency_logger,         # 📊 per-stage timing (passthrough)
            llm,                    # text → response text (LangGraph + Cerebras)
            greeting,               # 🔔 one-shot "Hi, I'm ready!" on connect
            tts,                    # response text → audio (Cartesia Sonic)
            tracker,                # 👁️ track BotStartedSpeakingFrame right before output
            transport.output(),     # send audio frames back to LiveKit
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
    user_name: str = "User",
    user_id: str = "",
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
        user_name=user_name,
        user_id=user_id,
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
