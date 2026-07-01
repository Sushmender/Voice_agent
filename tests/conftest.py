"""
tests/conftest.py
------------------
Pytest configuration: set test environment variables BEFORE any backend modules
are imported. This is critical because pydantic-settings validates at import time.

conftest.py is loaded by pytest before test collection, making it the right place
to set env vars that need to be present before any module-level code runs.
"""
import os

# ── Set test environment variables before any backend module is imported ──────
# These are fake values that allow Settings() to validate without a real .env file.
# Individual tests can override specific values using patch.dict(os.environ, ...).
os.environ.setdefault("CEREBRAS_API_KEY",   "test_cerebras_key")
os.environ.setdefault("LIVEKIT_URL",        "wss://test.livekit.cloud")
os.environ.setdefault("LIVEKIT_API_KEY",    "APItest123456789")
os.environ.setdefault("LIVEKIT_API_SECRET", "test_secret_abcdefghij_long_enough_for_jwt")
os.environ.setdefault("DEEPGRAM_API_KEY",   "test_deepgram_key")
os.environ.setdefault("CARTESIA_API_KEY",   "test_cartesia_key")
os.environ.setdefault("NOTION_API_KEY",     "")
os.environ.setdefault("NOTION_DATABASE_ID", "")
