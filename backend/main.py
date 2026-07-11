"""
backend/main.py
---------------
FastAPI application:
  - GET  /health                → health check
  - POST /api/token             → generate LiveKit participant JWT for browser
  - POST /api/agent/token       → generate LiveKit agent JWT (used by agent_worker)
  - GET  /api/rooms             → list active LiveKit rooms (debug)

This server is the HTTP layer. The voice pipeline runs separately via agent_worker.py.

Run:
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""
import asyncio
import logging
import pathlib
import time
import uuid
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.config import get_settings
from backend.db.mongodb import connect_to_mongo, close_mongo_connection
from backend.api import auth_routes
from backend.auth.deps import get_current_user
from backend.models.user import UserInDB

settings = get_settings()

# ── Pipeline import (lazy-ish to avoid pipecat startup logs at module import) ─
from backend.pipeline.voice_pipeline import run_pipeline


# ── LiveKit token generation ──────────────────────────────────────────────────
from livekit.api import AccessToken, VideoGrants

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Room → asyncio.Task mapping; prevents duplicate agents per room
_active_pipelines: dict[str, asyncio.Task] = {}


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice AI Agent API starting up...")
    logger.info(f"LiveKit URL: {settings.livekit_url}")
    await connect_to_mongo()
    yield
    # Cancel all running pipeline tasks on shutdown
    logger.info("Cancelling active pipeline tasks...")
    tasks_to_await = []
    for room, task in list(_active_pipelines.items()):
        if not task.done():
            task.cancel()
            tasks_to_await.append(task)
    if tasks_to_await:
        logger.info(f"Waiting for {len(tasks_to_await)} tasks to clean up...")
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks_to_await, return_exceptions=True),
                timeout=1.5
            )
        except asyncio.TimeoutError:
            logger.warning("Pipeline cleanup timed out. Forcing shutdown.")
    await close_mongo_connection()
    logger.info("Voice AI Agent API shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Voice AI Agent API",
    description="Backend API for the Voice-enabled Autonomous AI Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)


# ── Models ────────────────────────────────────────────────────────────────────
class TokenRequest(BaseModel):
    """Request body for generating a participant token."""
    room_name: str = "voice-agent-room"
    participant_name: str = "user"
    participant_identity: str | None = None  # auto-generated if not provided


class TokenResponse(BaseModel):
    """LiveKit JWT token + connection details."""
    token: str
    livekit_url: str
    room_name: str
    participant_identity: str
    expires_in: int = 3600  # seconds


# ── Token generation helper ───────────────────────────────────────────────────
def _create_token(
    room_name: str,
    participant_identity: str,
    participant_name: str,
    ttl_seconds: int = 3600,
    can_publish: bool = True,
    can_subscribe: bool = True,
) -> str:
    """
    Generate a LiveKit JWT for a participant.

    Args:
        room_name: LiveKit room to join.
        participant_identity: Unique identity string for this participant.
        participant_name: Display name shown in the room.
        ttl_seconds: Token validity period.
        can_publish: Whether participant can publish audio/video tracks.
        can_subscribe: Whether participant can subscribe to others' tracks.

    Returns:
        Signed JWT string.
    """
    token = AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_ttl(timedelta(seconds=ttl_seconds))
    token.with_grants(
        VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
        )
    )
    # Default metadata to empty JSON if not provided
    token.with_metadata("")
    return token.to_jwt()

def _create_token_with_metadata(
    room_name: str,
    participant_identity: str,
    participant_name: str,
    metadata: str,
    ttl_seconds: int = 3600,
    can_publish: bool = True,
    can_subscribe: bool = True,
) -> str:
    """Generate a LiveKit JWT with custom metadata."""
    token = AccessToken(
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_metadata(metadata)
    token.with_ttl(timedelta(seconds=ttl_seconds))
    token.with_grants(
        VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
        )
    )
    return token.to_jwt()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health", summary="Health check")
async def health_check():
    """Returns service health and basic config info."""
    return {
        "status": "ok",
        "service": "voice-ai-agent",
        "timestamp": time.time(),
        "livekit_url": settings.livekit_url,
        "cerebras_model": settings.cerebras_model,
    }


@app.post("/api/token", response_model=TokenResponse, summary="Get browser participant token")
async def get_participant_token(
    request: TokenRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate a LiveKit JWT for a browser user to join the voice room.
    Also auto-launches the Pipecat voice pipeline for that room if not already running.
    This means you only need FastAPI running — no separate agent_worker needed.
    """
    identity = request.participant_identity or f"user-{uuid.uuid4().hex[:8]}"
    import json
    metadata_json = json.dumps({"voice_id": current_user.voice_id})
    try:
        token = _create_token_with_metadata(
            room_name=request.room_name,
            participant_identity=identity,
            participant_name=request.participant_name,
            metadata=metadata_json,
            can_publish=True,
            can_subscribe=True,
        )
        logger.info(f"Generated browser token for '{identity}' in room '{request.room_name}'")

        # ── Auto-launch Pipecat pipeline for this room ───────────────────────────
        room_name = request.room_name
        existing = _active_pipelines.get(room_name)
        if existing is None or existing.done():
            agent_token = _create_token(
                room_name=room_name,
                participant_identity=settings.agent_participant_identity,
                participant_name="Voice AI Agent",
                can_publish=True,
                can_subscribe=True,
            )
            task = asyncio.create_task(
                _run_pipeline_task(room_name, agent_token, current_user.voice_id),
                name=f"pipeline-{room_name}",
            )
            _active_pipelines[room_name] = task
            logger.info(f"[Pipeline] Launched agent for room '{room_name}'")
        else:
            logger.info(f"[Pipeline] Agent already running for room '{room_name}'")

        return TokenResponse(
            token=token,
            livekit_url=settings.livekit_url,
            room_name=request.room_name,
            participant_identity=identity,
        )
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")


async def _run_pipeline_task(room_name: str, agent_token: str, voice_id: str):
    """Background asyncio task: run the Pipecat pipeline until the room empties."""
    logger.info(f"[Pipeline] Starting for room '{room_name}'...")
    try:
        await run_pipeline(
            livekit_url=settings.livekit_url,
            livekit_token=agent_token,
            room_name=room_name,
            groq_api_key=settings.groq_api_key,
            cartesia_api_key=settings.cartesia_api_key,
            cartesia_voice_id=voice_id,
        )
    except asyncio.CancelledError:
        logger.info(f"[Pipeline] Cancelled for room '{room_name}'")
    except Exception as exc:
        logger.error(f"[Pipeline] Error in room '{room_name}': {exc}", exc_info=True)
    finally:
        _active_pipelines.pop(room_name, None)
        logger.info(f"[Pipeline] Ended for room '{room_name}'")


@app.post("/api/agent/token", response_model=TokenResponse, summary="Get agent participant token")
async def get_agent_token(room_name: str = "voice-agent-room"):
    """
    Generate a LiveKit JWT for the Pipecat agent to join the room.
    Called by agent_worker.py when spinning up a new voice pipeline.
    """
    identity = settings.agent_participant_identity
    try:
        token = _create_token(
            room_name=room_name,
            participant_identity=identity,
            participant_name="Voice AI Agent",
            can_publish=True,
            can_subscribe=True,
        )
        logger.info(f"Generated agent token for room '{room_name}'")
        return TokenResponse(
            token=token,
            livekit_url=settings.livekit_url,
            room_name=room_name,
            participant_identity=identity,
        )
    except Exception as e:
        logger.error(f"Agent token generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent token generation failed: {str(e)}")


# ── Test client (browser UI) ──────────────────────────────────────────────────
_TEST_CLIENT_HTML = pathlib.Path(__file__).resolve().parent.parent / "test_client.html"

@app.get("/test", include_in_schema=False)
async def test_client():
    """
    Serve the voice-agent browser test client at http://localhost:8000/test
    No OpenAI key needed — connects to your own LiveKit room via your API token.
    """
    if not _TEST_CLIENT_HTML.exists():
        raise HTTPException(status_code=404, detail="test_client.html not found in project root")
    return FileResponse(_TEST_CLIENT_HTML, media_type="text/html")
