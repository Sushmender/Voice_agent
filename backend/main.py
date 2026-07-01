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
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import get_settings

settings = get_settings()


# ── LiveKit token generation ──────────────────────────────────────────────────
from livekit.api import AccessToken, VideoGrants

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice AI Agent API starting up...")
    logger.info(f"LiveKit URL: {settings.livekit_url}")
    yield
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
async def get_participant_token(request: TokenRequest):
    """
    Generate a LiveKit JWT for a browser user to join the voice room.
    Called by the frontend before opening the microphone.
    """
    identity = request.participant_identity or f"user-{uuid.uuid4().hex[:8]}"
    try:
        token = _create_token(
            room_name=request.room_name,
            participant_identity=identity,
            participant_name=request.participant_name,
            can_publish=True,
            can_subscribe=True,
        )
        logger.info(f"Generated browser token for '{identity}' in room '{request.room_name}'")
        return TokenResponse(
            token=token,
            livekit_url=settings.livekit_url,
            room_name=request.room_name,
            participant_identity=identity,
        )
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")


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
