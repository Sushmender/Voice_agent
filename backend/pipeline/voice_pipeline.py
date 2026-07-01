"""
backend/pipeline/voice_pipeline.py
------------------------------------
Day 1: Echo Stub Pipeline
--------------------------
Pipecat pipeline using LiveKit transport.
Architecture:
    LiveKit audio in → Deepgram STT → [LLM stub] → Cartesia TTS → LiveKit audio out

Day 1: The LLM slot is a simple EchoProcessor that replies with a canned message.
       This verifies the full audio path works before we wire in LangGraph (Day 3).

Day 2: Replace stub with real Deepgram STT + Cartesia TTS
Day 3: Replace EchoProcessor with LangGraphLLMService

Run this as a standalone process:
    python -m backend.pipeline.voice_pipeline
"""
import asyncio
import logging
import os
import sys
import time

# Pipecat core
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask

# Pipecat frames
from pipecat.frames.frames import (
    EndFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMMessagesAppendFrame,
    TextFrame,
)

# Pipecat processors
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.llm_service import LLMService

logger = logging.getLogger(__name__)


# ── Echo LLM Processor (Day 1 stub) ──────────────────────────────────────────
class EchoLLMService(LLMService):
    """
    Day 1 stub: Echoes back a canned response to prove the pipeline works.

    Replace this with LangGraphLLMService in Day 3.
    """

    def __init__(self):
        super().__init__()
        self._call_count = 0

    async def _process_frame(self, frame: object, direction: FrameDirection):
        """
        Intercept LLMMessagesFrame, extract the last user message,
        and push a TextFrame with a canned echo response.
        """
        await super()._process_frame(frame, direction)

        if isinstance(frame, LLMMessagesAppendFrame):
            self._call_count += 1
            # Extract last user message from conversation history
            user_text = ""
            for msg in reversed(frame.messages):
                if isinstance(msg, dict) and msg.get("role") == "user":
                    user_text = msg.get("content", "")
                    break

            logger.info(f"[EchoLLM] Turn #{self._call_count} | User said: '{user_text}'")

            # Signal TTS that a response is starting
            await self.push_frame(LLMFullResponseStartFrame())
            # Push echo response text (TTS will convert this to audio)
            echo_response = (
                f"Echo pipeline working. I heard you say: {user_text}. "
                f"This is turn number {self._call_count}. "
                f"The real LangGraph agent will be connected on Day 3."
            )
            await self.push_frame(TextFrame(echo_response))
            # Signal TTS that response is complete
            await self.push_frame(LLMFullResponseEndFrame())


# ── Main pipeline factory ─────────────────────────────────────────────────────
async def create_voice_pipeline(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    deepgram_api_key: str,
    cartesia_api_key: str,
    cartesia_voice_id: str,
) -> PipelineTask:
    """
    Build and return a Pipecat PipelineTask wired to LiveKit transport.

    Pipeline stages:
        transport.input()   → receive audio from LiveKit room
        STT service         → Deepgram Nova-3 (streaming speech-to-text)
        LLM service         → EchoLLMService stub (→ LangGraph on Day 3)
        TTS service         → Cartesia Sonic (text-to-speech)
        transport.output()  → send synthesized audio back to LiveKit room

    Args:
        livekit_url: wss:// URL of LiveKit cloud server.
        livekit_token: JWT participant token for the agent.
        room_name: Name of the LiveKit room to join.
        deepgram_api_key: Deepgram API key.
        cartesia_api_key: Cartesia API key.
        cartesia_voice_id: Cartesia voice UUID.

    Returns:
        Configured PipelineTask ready to run.
    """
    # Import pipecat plugins (imported here so missing packages give clear errors)
    try:
        from pipecat.services.deepgram.stt import DeepgramSTTService
    except ImportError:
        raise ImportError(
            "pipecat-ai deepgram plugin not installed. "
            "Run: pip install deepgram-sdk"
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

    # ── Transport ─────────────────────────────────────────────────────────────
    transport = LiveKitTransport(
        url=livekit_url,
        token=livekit_token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),    # built-in VAD — no CPU model needed separately
            vad_audio_passthrough=True,
        ),
    )

    # ── ASR (Day 1: will be real on Day 2, here as placeholder) ─────────────
    # NOTE: On Day 1 we include the real Deepgram STT — it's just that the
    # EchoLLM will handle it instead of the real LangGraph agent.
    stt = DeepgramSTTService(
        api_key=deepgram_api_key,
        model="nova-3",
        language="en-US",
        smart_format=True,
        interim_results=True,       # stream partial results while speaking
        utterance_end_ms=1000,      # wait 1s of silence before finalising
        vad_events=True,
    )

    # ── LLM (Day 1: Echo stub) ────────────────────────────────────────────────
    llm = EchoLLMService()

    # ── TTS ───────────────────────────────────────────────────────────────────
    tts = CartesiaTTSService(
        api_key=cartesia_api_key,
        voice_id=cartesia_voice_id,
        model="sonic-english",       # Cartesia Sonic — fastest model
        output_format="pcm_s16le",   # PCM 16-bit LE for LiveKit
        sample_rate=16000,
    )

    # ── Pipeline ──────────────────────────────────────────────────────────────
    pipeline = Pipeline(
        [
            transport.input(),  # receive audio frames from LiveKit
            stt,                # speech → text (Deepgram)
            llm,                # text → response text (Echo / LangGraph)
            tts,                # response text → audio (Cartesia)
            transport.output(), # send audio frames back to LiveKit
        ]
    )

    task = PipelineTask(
        pipeline,
        PipelineParams(
            allow_interruptions=True,   # user can interrupt mid-response
            enable_metrics=True,        # log latency metrics per stage
        ),
    )

    return task


async def run_pipeline(
    livekit_url: str,
    livekit_token: str,
    room_name: str,
    deepgram_api_key: str,
    cartesia_api_key: str,
    cartesia_voice_id: str,
):
    """Entry point to run the pipeline until the room is empty or an error occurs."""
    start_time = time.perf_counter()
    logger.info(f"Starting voice pipeline for room '{room_name}'...")

    task = await create_voice_pipeline(
        livekit_url=livekit_url,
        livekit_token=livekit_token,
        room_name=room_name,
        deepgram_api_key=deepgram_api_key,
        cartesia_api_key=cartesia_api_key,
        cartesia_voice_id=cartesia_voice_id,
    )

    runner = PipelineRunner()
    await runner.run(task)

    elapsed = time.perf_counter() - start_time
    logger.info(f"Pipeline for room '{room_name}' ended after {elapsed:.1f}s")


# ── Standalone test mode ──────────────────────────────────────────────────────
if __name__ == "__main__":
    """
    Run the echo pipeline directly (without the livekit-agents worker).
    Useful for quick Day 1 testing.

    Usage:
        python -m backend.pipeline.voice_pipeline

    Requires .env to be configured with LiveKit, Deepgram, and Cartesia keys.
    """
    import os
    from dotenv import load_dotenv

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Validate required env vars
    required = [
        "LIVEKIT_URL", "DEEPGRAM_API_KEY", "CARTESIA_API_KEY",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your keys.")
        sys.exit(1)

    # For standalone mode, we need an agent token from our FastAPI server
    # Start FastAPI first: uvicorn backend.main:app --port 8000
    # Then call: POST http://localhost:8000/api/agent/token
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
            deepgram_api_key=os.getenv("DEEPGRAM_API_KEY"),
            cartesia_api_key=os.getenv("CARTESIA_API_KEY"),
            cartesia_voice_id=os.getenv(
                "CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"
            ),
        )

    asyncio.run(main())
