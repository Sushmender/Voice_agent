"""
tests/conftest.py
------------------
Pytest configuration: set test environment variables BEFORE any backend modules
are imported. This is critical because pydantic-settings validates at import time.

conftest.py is loaded by pytest before test collection, making it the right place
to set env vars that need to be present before any module-level code runs.
"""
import os
import uuid

import pytest

# ── Exclude test_env_keys.py from normal test runs ───────────────────────────
# test_env_keys.py is a standalone connectivity script that makes live API calls
# at module-level (not inside test functions). Including it in pytest auto-collection
# causes INTERNALERRROR because Python imports it — triggering network requests —
# before any monkeypatching or mocking can be applied.
# Run it manually: python tests/test_env_keys.py
collect_ignore = ["test_env_keys.py"]

# ── Set test environment variables before any backend module is imported ──────
# These are fake values that allow Settings() to validate without a real .env file.
# Individual tests can override specific values using patch.dict(os.environ, ...).
os.environ.setdefault("CEREBRAS_API_KEY",   "test_cerebras_key")
os.environ.setdefault("LIVEKIT_URL",        "wss://test.livekit.cloud")
os.environ.setdefault("LIVEKIT_API_KEY",    "APItest123456789")
os.environ.setdefault("LIVEKIT_API_SECRET", "test_secret_abcdefghij_long_enough_for_jwt")
os.environ.setdefault("GROQ_API_KEY",        "test_groq_key")
os.environ.setdefault("CARTESIA_API_KEY",   "test_cartesia_key")
os.environ.setdefault("NOTION_API_KEY",     "")
os.environ.setdefault("NOTION_DATABASE_ID", "")


# ── Shared E2E fixtures ───────────────────────────────────────────────────────

@pytest.fixture
def skip_if_no_live_apis():
    """
    Skip the test if the LIVE_APIS environment variable is not set to "1".

    Usage in test class:
        @pytest.mark.usefixtures("skip_if_no_live_apis")
        class TestMyLiveTests:
            ...

    Or on individual tests:
        def test_something(self, skip_if_no_live_apis):
            ...

    Run live tests with:
        $env:LIVE_APIS="1"; pytest -m live -v --log-cli-level=INFO
    """
    if os.environ.get("LIVE_APIS") != "1":
        pytest.skip(
            "Skipped: set LIVE_APIS=1 to run tests that make real API calls. "
            "Requires .env with valid CEREBRAS_API_KEY, GROQ_API_KEY, CARTESIA_API_KEY."
        )


@pytest.fixture
def unique_session_id():
    """
    Return a unique session ID string for each test invocation.

    Prevents short-term memory bleed between tests that share the same in-process
    memory store. Each test gets its own isolated session namespace.
    """
    session_id = f"e2e-test-{uuid.uuid4().hex[:8]}"
    yield session_id
    # Cleanup: remove session from memory store after test completes
    try:
        import backend.memory.short_term as mem
        mem.clear_session(session_id)
    except Exception:
        pass  # non-fatal — test already finished


@pytest.fixture
def captured_frames():
    """
    Return a list that collects frames pushed by a processor under test.

    Usage:
        svc.push_frame = captured_frames_appender(captured_frames)

    Or use the helper `make_frame_capture` below.
    """
    return []


def make_frame_capture(target_list: list):
    """
    Return an async push_frame stub that appends every frame to `target_list`.

    Use this to replace `processor.push_frame` in unit / E2E tests:
        svc.push_frame = make_frame_capture(my_list)
    """
    async def _capture(frame, direction=None):
        target_list.append(frame)
    return _capture
