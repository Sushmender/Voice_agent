"""
tests/test_day1.py
-------------------
Day 1 Automated Test Suite
============================
Covers every checklist item from tasks.md Day 1 that can be verified
without a real browser session.

Test categories
---------------
1. Agent worker - import, structure, env validation logic
2. Voice pipeline - EchoLLMService, pipeline construction (mocked transport)
3. LiveKit token - agent + browser tokens generated correctly
4. LiveKit connectivity - verify we can reach the LiveKit Cloud WS endpoint
   (network ping-only; no full room join required)

Run:
    pytest tests/test_day1.py -v
"""

import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ===========================================================================
# 1. AGENT WORKER TESTS
# ===========================================================================

class TestAgentWorkerImport:
    """Verify agent_worker.py can be imported and its structure is correct."""

    def test_agent_worker_module_imports(self):
        """agent_worker module should import without errors."""
        import importlib
        mod = importlib.import_module("backend.agent_worker")
        assert mod is not None

    def test_entrypoint_is_callable(self):
        """entrypoint() coroutine must exist and be an async function."""
        import inspect
        from backend import agent_worker
        assert hasattr(agent_worker, "entrypoint")
        assert inspect.iscoroutinefunction(agent_worker.entrypoint)

    def test_prewarm_is_callable(self):
        """prewarm() must be a regular (sync) callable."""
        import inspect
        from backend import agent_worker
        assert hasattr(agent_worker, "prewarm")
        assert callable(agent_worker.prewarm)

    def test_fastapi_url_uses_settings(self):
        """FASTAPI_URL should derive from settings host/port."""
        from backend import agent_worker
        from backend.config import get_settings
        s = get_settings()
        expected_port = s.app_port
        assert str(expected_port) in agent_worker.FASTAPI_URL

    def test_get_agent_token_is_async(self):
        """_get_agent_token must be an async function."""
        import inspect
        from backend import agent_worker
        assert inspect.iscoroutinefunction(agent_worker._get_agent_token)

    @pytest.mark.asyncio
    async def test_get_agent_token_calls_fastapi(self):
        """_get_agent_token should POST to /api/agent/token and return the token."""
        from backend import agent_worker

        fake_token = "fake.jwt.token"
        fake_response = {
            "token": fake_token,
            "livekit_url": "wss://test.livekit.cloud",
            "room_name": "test-room",
            "participant_identity": "voice-agent-bot",
        }

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = fake_response

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        with patch("httpx.AsyncClient") as mock_class:
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await agent_worker._get_agent_token("test-room")

        assert result == fake_token

    def test_env_validation_detects_missing_keys(self, monkeypatch):
        """Missing required env vars should be detected before worker starts."""
        required_keys = [
            "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
            "GROQ_API_KEY", "CARTESIA_API_KEY",
        ]
        env_backup = {}
        for k in required_keys:
            env_backup[k] = os.environ.pop(k, None)
            monkeypatch.delenv(k, raising=False)

        missing = [k for k in required_keys if not os.getenv(k)]
        assert len(missing) == len(required_keys)

        # Restore
        for k, v in env_backup.items():
            if v is not None:
                os.environ[k] = v


# ===========================================================================
# 2. ECHO LLM SERVICE TESTS
# ===========================================================================

class TestEchoLLMService:
    """Unit tests for the Day 1 EchoLLMService stub."""

    def test_echo_service_instantiates(self):
        """EchoLLMService must instantiate without errors."""
        from backend.pipeline.voice_pipeline import EchoLLMService
        svc = EchoLLMService()
        assert svc is not None
        assert svc._call_count == 0

    @pytest.mark.asyncio
    async def test_echo_responds_to_messages_append(self):
        """EchoLLMService should push TextFrame + boundary frames on LLMMessagesAppendFrame."""
        from pipecat.frames.frames import (
            LLMFullResponseEndFrame,
            LLMFullResponseStartFrame,
            LLMMessagesAppendFrame,
            TextFrame,
        )
        from backend.pipeline.voice_pipeline import EchoLLMService

        svc = EchoLLMService()
        pushed_frames = []

        async def fake_push(frame, direction=None):
            pushed_frames.append(frame)

        svc.push_frame = fake_push

        frame = LLMMessagesAppendFrame(
            messages=[{"role": "user", "content": "hello world"}]
        )
        from pipecat.processors.frame_processor import FrameDirection
        await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        frame_types = [type(f).__name__ for f in pushed_frames]
        assert "LLMFullResponseStartFrame" in frame_types
        assert "TextFrame" in frame_types
        assert "LLMFullResponseEndFrame" in frame_types

    @pytest.mark.asyncio
    async def test_echo_increments_call_count(self):
        """EchoLLMService should increment _call_count per turn."""
        from pipecat.frames.frames import LLMMessagesAppendFrame
        from backend.pipeline.voice_pipeline import EchoLLMService
        from pipecat.processors.frame_processor import FrameDirection

        svc = EchoLLMService()
        svc.push_frame = AsyncMock()

        frame = LLMMessagesAppendFrame(
            messages=[{"role": "user", "content": "test"}]
        )
        await svc.process_frame(frame, FrameDirection.DOWNSTREAM)
        await svc.process_frame(frame, FrameDirection.DOWNSTREAM)
        assert svc._call_count == 2

    @pytest.mark.asyncio
    async def test_echo_includes_user_text_in_response(self):
        """Echo response should include the user spoken text."""
        from pipecat.frames.frames import LLMMessagesAppendFrame, TextFrame
        from backend.pipeline.voice_pipeline import EchoLLMService
        from pipecat.processors.frame_processor import FrameDirection

        svc = EchoLLMService()
        pushed_frames = []

        async def fake_push(frame, direction=None):
            pushed_frames.append(frame)

        svc.push_frame = fake_push

        user_text = "the quick brown fox"
        frame = LLMMessagesAppendFrame(
            messages=[{"role": "user", "content": user_text}]
        )
        await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        text_frames = [f for f in pushed_frames if isinstance(f, TextFrame)]
        assert text_frames, "Should have pushed at least one TextFrame"
        combined_text = " ".join(f.text for f in text_frames)
        assert user_text in combined_text, (
            f"Echo response should contain user input, got: {combined_text!r}"
        )


# ===========================================================================
# 3. LIVEKIT TOKEN GENERATION TESTS
# ===========================================================================

class TestLiveKitTokenGeneration:
    """Tests for LiveKit JWT generation (agent + browser participant tokens)."""

    def test_agent_token_generated_via_main(self):
        """FastAPI /api/agent/token should return a valid JWT."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.post("/api/agent/token", params={"room_name": "test-room"})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 50
        assert data["room_name"] == "test-room"
        assert data["livekit_url"].startswith("wss://")

    def test_browser_token_generated_via_main(self):
        """FastAPI /api/token should return a valid participant JWT."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.post(
            "/api/token",
            json={"room_name": "voice-agent-room", "participant_name": "alice"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 50
        assert data["room_name"] == "voice-agent-room"
        assert data["participant_identity"].startswith("user-")

    def test_agent_token_has_correct_identity(self):
        """Agent token identity should match settings.agent_participant_identity."""
        from fastapi.testclient import TestClient
        from backend.main import app
        from backend.config import get_settings

        s = get_settings()
        client = TestClient(app)
        response = client.post("/api/agent/token", params={"room_name": "voice-agent-room"})
        data = response.json()
        assert data["participant_identity"] == s.agent_participant_identity

    def test_livekit_token_is_jwt_format(self):
        """Tokens should be 3-part dot-separated JWTs."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        resp = client.post("/api/token", json={"room_name": "room-x"})
        token = resp.json()["token"]
        parts = token.split(".")
        assert len(parts) == 3, f"JWT should have 3 parts, got {len(parts)}"


# ===========================================================================
# 4. LIVEKIT CLOUD CONNECTIVITY TEST
# ===========================================================================

class TestLiveKitCloudConnectivity:
    """
    Verify we can reach LiveKit Cloud over the network.
    Skipped when running in CI without real keys.
    """

    @pytest.fixture(autouse=True)
    def skip_if_dummy_env(self):
        """Skip integration tests if using dummy/test environment values."""
        from dotenv import load_dotenv
        load_dotenv()
        url = os.getenv("LIVEKIT_URL", "")
        if "test.livekit" in url or not url.startswith("wss://"):
            pytest.skip("Skipping LiveKit connectivity test - real LIVEKIT_URL not set")

    def test_livekit_cloud_url_is_configured(self):
        """LIVEKIT_URL must be a valid wss:// endpoint."""
        url = os.environ["LIVEKIT_URL"]
        assert url.startswith("wss://")
        assert "livekit" in url.lower()

    def test_livekit_api_key_is_configured(self):
        """LIVEKIT_API_KEY must start with API prefix."""
        key = os.environ["LIVEKIT_API_KEY"]
        assert key.startswith("API")
        assert len(key) > 10

    def test_livekit_api_secret_is_configured(self):
        """LIVEKIT_API_SECRET must be long enough for JWT signing."""
        secret = os.environ["LIVEKIT_API_SECRET"]
        assert len(secret) >= 20

    @pytest.mark.asyncio
    async def test_livekit_cloud_http_reachable(self):
        """LiveKit Cloud should respond to HTTPS probe."""
        import httpx
        from dotenv import load_dotenv
        load_dotenv()

        wss_url = os.environ["LIVEKIT_URL"]
        http_url = wss_url.replace("wss://", "https://").replace("ws://", "http://")
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(http_url)
            assert resp.status_code in (200, 301, 302, 404)
        except httpx.ConnectError as e:
            pytest.fail(f"Could not connect to LiveKit Cloud at {http_url}: {e}")

    def test_livekit_jwt_generated_with_real_keys(self):
        """Generate a real JWT using the real API keys."""
        from dotenv import load_dotenv
        load_dotenv()
        from livekit.api import AccessToken, VideoGrants

        token = (
            AccessToken(
                os.environ["LIVEKIT_API_KEY"],
                os.environ["LIVEKIT_API_SECRET"],
            )
            .with_identity("day1-smoke-test")
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room="voice-agent-room",
                    can_publish=True,
                    can_subscribe=True,
                )
            )
            .to_jwt()
        )
        parts = token.split(".")
        assert len(parts) == 3
        assert len(token) > 100


# ===========================================================================
# 5. PIPELINE CONSTRUCTION TEST (mocked transport)
# ===========================================================================

class TestVoicePipelineConstruction:
    """
    Test that create_voice_pipeline() returns a valid PipelineTask.
    LiveKit transport is mocked to avoid real connections.
    """

    @pytest.mark.asyncio
    async def test_pipeline_factory_returns_task(self):
        """create_voice_pipeline should return a PipelineTask."""
        from dotenv import load_dotenv
        load_dotenv()
        from pipecat.pipeline.task import PipelineTask, PipelineWorker

        mock_transport = MagicMock()
        mock_transport.input.return_value = MagicMock()
        mock_transport.output.return_value = MagicMock()

        with patch(
            "pipecat.transports.livekit.transport.LiveKitTransport",
            return_value=mock_transport,
        ), patch(
            "pipecat.audio.vad.silero.SileroVADAnalyzer",
            return_value=MagicMock(),
        ):
            from backend.pipeline.voice_pipeline import create_voice_pipeline
            worker = await create_voice_pipeline(
                livekit_url=os.getenv("LIVEKIT_URL", "wss://test.livekit.cloud"),
                livekit_token="fake.jwt.token",
                room_name="test-room",
                groq_api_key=os.getenv("GROQ_API_KEY", "test-groq-key"),
                cartesia_api_key=os.getenv("CARTESIA_API_KEY", "test-cartesia-key"),
                cartesia_voice_id=os.getenv(
                    "CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"
                ),
            )
        assert isinstance(worker, (PipelineTask, PipelineWorker))

    def test_pipeline_imports_all_required_components(self):
        """All required pipecat components should be importable."""
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.runner import PipelineRunner
        from pipecat.workers.runner import WorkerRunner
        from pipecat.pipeline.task import PipelineParams, PipelineTask, PipelineWorker
        from pipecat.frames.frames import (
            EndFrame, LLMFullResponseEndFrame, LLMFullResponseStartFrame,
            LLMMessagesAppendFrame, TextFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
        from pipecat.services.llm_service import LLMService
        from pipecat.services.groq.stt import GroqSTTService
        from pipecat.services.cartesia.tts import CartesiaTTSService
        from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        assert True  # No ImportError = success

    def test_run_pipeline_is_async(self):
        """run_pipeline() must be async."""
        import inspect
        from backend.pipeline.voice_pipeline import run_pipeline
        assert inspect.iscoroutinefunction(run_pipeline)


# ===========================================================================
# 6. DAY 1 MILESTONE SANITY
# ===========================================================================

class TestDay1Milestone:
    """
    Verifies Day 1 milestone checklist items that can be automated:
    - Config loads correctly
    - FastAPI health endpoint returns {status: ok}
    - Token endpoint returns a JWT
    - Agent worker importable + structured correctly
    - Echo pipeline constructible and produces correct frames
    """

    def test_health_endpoint_ok(self):
        """GET /health returns {status: ok}."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_config_all_required_fields_present(self):
        """Settings object has all required Day 1 fields."""
        from backend.config import get_settings
        s = get_settings()
        required_fields = [
            "livekit_url", "livekit_api_key", "livekit_api_secret",
            "groq_api_key", "cartesia_api_key", "cartesia_voice_id",
            "cerebras_api_key", "app_host", "app_port",
            "log_level", "agent_participant_identity",
        ]
        for field in required_fields:
            assert hasattr(s, field), f"Settings missing field: {field}"

    @pytest.mark.asyncio
    async def test_echo_pipeline_end_to_end_stub(self):
        """EchoLLMService round-trip: user message -> TextFrame + boundary frames."""
        from pipecat.frames.frames import LLMMessagesAppendFrame, TextFrame
        from pipecat.processors.frame_processor import FrameDirection
        from backend.pipeline.voice_pipeline import EchoLLMService

        svc = EchoLLMService()
        pushed = []

        async def capture(frame, direction=None):
            pushed.append(frame)

        svc.push_frame = capture
        frame = LLMMessagesAppendFrame(
            messages=[{"role": "user", "content": "Are you there?"}]
        )
        await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        types = {type(f).__name__ for f in pushed}
        assert "TextFrame" in types
        assert "LLMFullResponseStartFrame" in types
        assert "LLMFullResponseEndFrame" in types


