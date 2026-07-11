"""
backend/config.py
-----------------
Centralised settings loaded from .env via Pydantic BaseSettings.
All other modules import `settings` from here — never read env vars directly.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # ── Cerebras LLM ──────────────────────────────────────────────────────────
    cerebras_api_key: str = Field(..., description="Cerebras API key")
    cerebras_model: str = Field("gpt-oss-120b", description="Cerebras model name")
    # Cerebras uses an OpenAI-compatible API at this base URL
    cerebras_base_url: str = Field(
        "https://api.cerebras.ai/v1",
        description="Cerebras OpenAI-compatible base URL",
    )

    # ── LiveKit Cloud ─────────────────────────────────────────────────────────
    livekit_url: str = Field(..., description="wss://your-project.livekit.cloud")
    livekit_api_key: str = Field(..., description="LiveKit API key")
    livekit_api_secret: str = Field(..., description="LiveKit API secret")
    livekit_room_name: str = Field("voice-agent-room", description="Default room name")
    agent_participant_identity: str = Field(
        "voice-agent-bot", description="Agent participant identity in LiveKit"
    )

    # ── Groq (Whisper ASR) ───────────────────────────────────────────────────
    groq_api_key: str = Field(..., description="Groq API key (used for Whisper ASR via Groq)")

    # ── Cartesia ──────────────────────────────────────────────────────────────
    cartesia_api_key: str = Field(..., description="Cartesia Sonic API key")
    # For Version 1.0 backward compatibility, keep this as default
    cartesia_voice_id: str = Field(
        "694f9389-aac1-45b6-b726-9d9369183238",
        description="Cartesia default voice ID",
    )
    cartesia_voice_ids: str = Field(
        "694f9389-aac1-45b6-b726-9d9369183238",
        description="Comma-separated list of Cartesia voice IDs to randomly assign to new users",
    )

    # ── Database & Auth ───────────────────────────────────────────────────────
    mongodb_uri: str = Field("mongodb://localhost:27017", description="MongoDB connection string")
    jwt_secret_key: str = Field("change_this_to_a_secure_random_string", description="JWT signing key")
    jwt_algorithm: str = Field("HS256", description="Algorithm used to sign JWTs")
    jwt_expiration_hours: int = Field(24, description="JWT expiration time in hours")

    # ── Notion ────────────────────────────────────────────────────────────────
    notion_api_key: str = Field("", description="Notion integration token")
    notion_database_id: str = Field("", description="Notion database ID for notes")

    # ── App ───────────────────────────────────────────────────────────────────
    app_host: str = Field("0.0.0.0", description="FastAPI host")
    app_port: int = Field(8000, description="FastAPI port")
    log_level: str = Field("INFO", description="Logging level")
    max_session_history: int = Field(
        20, description="Max turns kept in short-term memory per session"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# NOTE: Do NOT call get_settings() here at module level.
# Import and call get_settings() in each module that needs it,
# so tests can properly patch environment variables before instantiation.
# Example usage in other modules:
#   from backend.config import get_settings
#   settings = get_settings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached Settings singleton. Call this instead of importing settings directly."""
    return Settings()


def get_settings_uncached() -> Settings:
    """Create a fresh Settings instance (bypasses lru_cache — used in tests)."""
    return Settings()
