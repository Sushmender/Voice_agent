"""
backend/agent_worker.py
-----------------------
LiveKit Agents worker — dispatches Pipecat voice pipelines when users join rooms.

Architecture:
    1. This process registers as a LiveKit worker with LiveKit Cloud.
    2. When a user joins a room, LiveKit Cloud dispatches a job to this worker.
    3. The worker generates an agent participant token via the FastAPI server.
    4. It then launches a Pipecat voice pipeline that joins the same room.

This is the entry point for the AI voice agent. Run:
    python backend/agent_worker.py

Requires:
    - FastAPI server running on port 8000 (uvicorn backend.main:app --port 8000)
    - .env with all required keys configured
"""
import asyncio
import logging
import os
import pathlib
import sys

import httpx
from dotenv import load_dotenv

# ── livekit-agents (job dispatch framework) ───────────────────────────────────
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    WorkerType,
    cli,
    metrics,
)

# ── Local imports ─────────────────────────────────────────────────────────────
from backend.config import get_settings
settings = get_settings()
from backend.pipeline.voice_pipeline import run_pipeline

load_dotenv()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# FastAPI server URL for agent token generation
FASTAPI_URL = f"http://{settings.app_host if settings.app_host != '0.0.0.0' else 'localhost'}:{settings.app_port}"


async def _get_agent_token(room_name: str) -> str:
    """
    Fetch an agent participant token from the FastAPI server.

    The FastAPI server (/api/agent/token) creates a LiveKit JWT for the
    Pipecat pipeline to join the room as an agent participant.

    Args:
        room_name: LiveKit room name to generate a token for.

    Returns:
        JWT token string.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{FASTAPI_URL}/api/agent/token",
            params={"room_name": room_name},
        )
        resp.raise_for_status()
        data = resp.json()
        logger.debug(f"Got agent token for room '{room_name}', identity='{data['participant_identity']}'")
        return data["token"]


async def entrypoint(ctx: JobContext):
    """
    LiveKit Agents job handler.

    Called automatically by the livekit-agents framework whenever a user joins
    a LiveKit room that needs an agent. LiveKit Cloud dispatches this job.

    Flow:
        1. Accept the job and connect to the room (for room lifecycle tracking).
        2. Request an agent-specific participant token from FastAPI.
        3. Launch the Pipecat voice pipeline in the same room.
        4. Pipeline runs until the user disconnects or an error occurs.

    Args:
        ctx: Job context provided by livekit-agents (room info, process info).
    """
    room_name = ctx.room.name
    logger.info(f"[Agent] Job accepted for room: '{room_name}'")

    # Connect to the room as observer (tracks room lifecycle events)
    # The Pipecat pipeline will join separately as a publishing participant
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_NONE)
    logger.info(f"[Agent] Connected to room '{room_name}' as observer")

    # Get Pipecat agent token from FastAPI
    try:
        agent_token = await _get_agent_token(room_name)
    except httpx.HTTPError as e:
        logger.error(
            f"[Agent] Failed to get agent token: {e}. "
            f"Is the FastAPI server running at {FASTAPI_URL}?"
        )
        return

    # Launch Pipecat voice pipeline in this room
    logger.info(f"[Agent] Launching Pipecat voice pipeline for room '{room_name}'...")

    # Retrieve pre-warmed VAD analyzer from prewarm() (Day 2)
    vad_analyzer = getattr(ctx.proc, "userdata", {}).get("vad_analyzer")

    try:
        await run_pipeline(
            livekit_url=settings.livekit_url,
            livekit_token=agent_token,
            room_name=room_name,
            groq_api_key=settings.groq_api_key,
            cartesia_api_key=settings.cartesia_api_key,
            cartesia_voice_id=settings.cartesia_voice_id,
            vad_analyzer=vad_analyzer,
        )
    except Exception as e:
        logger.error(f"[Agent] Pipeline error in room '{room_name}': {e}", exc_info=True)
    finally:
        logger.info(f"[Agent] Pipeline ended for room '{room_name}'")


def prewarm(proc: JobProcess):
    """
    Pre-warm resources before the first job arrives.
    Called once when the worker process starts.

    Day 2: Pre-load the Silero VAD model so it is ready when the first room
    join fires. The model (~8 MB) takes ~500 ms on first load; pre-warming
    removes this latency from the first conversation turn.
    """
    logger.info("[Worker] Pre-warming agent resources...")

    # Pre-load Silero VAD into process userdata so entrypoint can reuse it
    try:
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        try:
            from pipecat.audio.vad.vad_analyzer import VADParams
            proc.userdata["vad_analyzer"] = SileroVADAnalyzer(
                params=VADParams(stop_secs=0.8)
            )
        except (ImportError, TypeError):
            proc.userdata["vad_analyzer"] = SileroVADAnalyzer()
        logger.info("[Worker] Silero VAD model pre-loaded (stop_secs=0.8).")
    except Exception as exc:
        logger.warning(f"[Worker] VAD pre-warm failed (non-fatal): {exc}")
        proc.userdata["vad_analyzer"] = None

    # TODO (Day 3): Pre-initialise LangGraph agent and Cerebras client
    logger.info("[Worker] Pre-warm complete.")


if __name__ == "__main__":
    """
    Start the LiveKit Agents worker.

    The worker:
        - Connects to LiveKit Cloud using LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
        - Registers as a worker capable of handling voice agent jobs
        - When a user joins a room, LiveKit dispatches a job here → entrypoint() is called

    Requires FastAPI server to be running first.
    """
    # Validate environment before starting
    required_keys = [
        "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
        "GROQ_API_KEY", "CARTESIA_API_KEY",
    ]
    missing = [k for k in required_keys if not os.getenv(k)]
    if missing:
        print(f"\nERROR: Missing environment variables: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in your API keys.\n")
        sys.exit(1)

    logger.info("Starting Voice AI Agent Worker...")
    logger.info(f"  LiveKit URL : {settings.livekit_url}")
    logger.info(f"  ASR         : Groq Whisper (whisper-large-v3-turbo)")
    logger.info(f"  TTS         : Cartesia Sonic")
    logger.info(f"  LLM         : {settings.cerebras_model} (via Cerebras)")
    logger.info(f"  Pipeline    : Pipecat + LiveKit transport")

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            # WorkerType.ROOM = dispatch a job per room join (livekit-agents v1.x)
            worker_type=WorkerType.ROOM,
        )
    )

