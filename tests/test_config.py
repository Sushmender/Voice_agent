"""
tests/test_config.py
---------------------
Day 1 tests: validate configuration loading and token generation.
Run: pytest tests/test_config.py -v
"""
import os
import pytest
from unittest.mock import patch

# Minimal env needed to instantiate Settings in tests without a real .env
_TEST_ENV = {
    "CEREBRAS_API_KEY": "test_cerebras_key",
    "LIVEKIT_URL": "wss://test.livekit.cloud",
    "LIVEKIT_API_KEY": "APItest123456",
    "LIVEKIT_API_SECRET": "test_secret_abcdefghij_long_enough_for_jwt_signing",
    "GROQ_API_KEY": "test_groq_key",
    "CARTESIA_API_KEY": "test_cartesia_key",
}


class TestConfigLoading:
    """Test that config loads correctly from environment variables."""

    def test_settings_import(self):
        """Config module should be importable."""
        from backend.config import Settings
        assert Settings is not None

    def test_settings_has_required_fields(self):
        """Settings class should define all required keys."""
        from backend.config import Settings
        fields = Settings.model_fields
        required_fields = [
            "cerebras_api_key",
            "livekit_url",
            "livekit_api_key",
            "livekit_api_secret",
            "groq_api_key",
            "cartesia_api_key",
        ]
        for field in required_fields:
            assert field in fields, f"Missing required field: {field}"

    def test_settings_defaults(self):
        """Optional fields should have sensible defaults."""
        from backend.config import Settings

        # Bypass lru_cache singleton: instantiate Settings directly with _env_file=None
        with patch.dict(os.environ, _TEST_ENV, clear=False):
            s = Settings(_env_file=None)
            assert s.cerebras_model == "gpt-oss-120b"
            assert s.app_port == 8000
            assert s.max_session_history == 20
            assert s.log_level == "INFO"

    def test_settings_reads_env_overrides(self):
        """Settings should respect environment variable overrides."""
        from backend.config import Settings

        overrides = {**_TEST_ENV, "CEREBRAS_MODEL": "llama3.1-70b", "APP_PORT": "9000"}
        with patch.dict(os.environ, overrides, clear=False):
            s = Settings(_env_file=None)
            assert s.cerebras_api_key == "test_cerebras_key"
            assert s.cerebras_model == "llama3.1-70b"
            assert s.app_port == 9000



class TestFastAPIApp:
    """Test the FastAPI application endpoints."""

    @pytest.fixture
    def mock_settings(self):
        """Mock settings object — bypasses lru_cache singleton entirely."""
        from unittest.mock import MagicMock
        s = MagicMock()
        s.livekit_api_key = "APItest123456"
        s.livekit_api_secret = "test_secret_abcdefghij_long_enough_for_jwt"
        s.livekit_url = "wss://test.livekit.cloud"
        s.livekit_room_name = "voice-agent-room"
        s.agent_participant_identity = "voice-agent-bot"
        s.cerebras_model = "gpt-oss-120b"
        s.groq_api_key = "test_groq"
        s.cartesia_api_key = "test_ca"
        s.log_level = "INFO"
        return s

    @pytest.fixture
    def client(self, mock_settings):
        """Return a TestClient with mocked settings injected into backend.main."""
        from fastapi.testclient import TestClient
        with patch("backend.main.settings", mock_settings):
            from backend.main import app
            return TestClient(app)

    def test_health_endpoint_returns_ok(self, client, mock_settings):
        """GET /health should return 200 with status=ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "livekit_url" in data

    def test_health_includes_model_info(self, client):
        """Health check should include model configuration."""
        response = client.get("/health")
        data = response.json()
        assert "cerebras_model" in data

    def test_token_endpoint_returns_jwt(self, client):
        """POST /api/token should return a JWT token."""
        response = client.post("/api/token", json={
            "room_name": "test-room",
            "participant_name": "Alice",
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 50  # JWT tokens are always long
        assert data["room_name"] == "test-room"
        assert "participant_identity" in data

    def test_token_endpoint_auto_generates_identity(self, client):
        """Token endpoint should auto-generate identity if not provided."""
        response = client.post("/api/token", json={
            "room_name": "test-room",
            "participant_name": "Bob",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["participant_identity"].startswith("user-")

    def test_token_endpoint_respects_custom_identity(self, client):
        """Token endpoint should use provided participant_identity."""
        response = client.post("/api/token", json={
            "room_name": "test-room",
            "participant_name": "Carol",
            "participant_identity": "carol-session-abc123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["participant_identity"] == "carol-session-abc123"

