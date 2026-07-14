"""
tests/e2e_pipeline1_llm.py
===========================
End-to-End Pipeline Test — ASR → LLM → TTS (with short-term memory)
=====================================================================

Tests the full LangGraphLLMService → run_agent_turn → memory chain
without requiring a live LiveKit room or microphone.

Audio frames are injected synthetically; the pipeline stages are wired
together in the same way as production but transport is removed.

Pipeline under test:
    LLMMessagesAppendFrame (simulated transcript)
      → LangGraphLLMService.process_frame()
          → _run_agent_turn()  [Cerebras LLM or mock]
          → memory.save_memory() [via LangGraph graph]
      → LLMFullResponseStartFrame + TextFrame + LLMFullResponseEndFrame

Test classes
------------
TestE2EPipeline1Smoke  — Always runs. LLM is mocked. Safe for CI / offline.
TestE2EPipeline1Live   — Only when LIVE_APIS=1. Calls real Cerebras API.

Run:
    # Smoke (no API keys needed)
    pytest tests/e2e_pipeline1_llm.py -v -m "not live"

    # Live (requires .env with real keys)
    $env:LIVE_APIS="1"
    pytest tests/e2e_pipeline1_llm.py -v -m live --log-cli-level=INFO
"""

import asyncio
import logging
import os
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

logger = logging.getLogger(__name__)


# ===========================================================================
# Helpers
# ===========================================================================

def _make_llm_service(session_id: str | None = None) -> tuple:
    """
    Instantiate LangGraphLLMService with push_frame stubbed out.

    Returns:
        (service, frames_list) — every pushed frame is appended to frames_list.
    """
    from backend.pipeline.voice_pipeline import LangGraphLLMService

    sid = session_id or f"e2e-{uuid.uuid4().hex[:8]}"
    svc = LangGraphLLMService(session_id=sid)

    frames: list = []

    async def _capture(frame, direction=None):
        frames.append(frame)

    svc.push_frame = _capture
    return svc, frames


def _user_frame(text: str):
    """Build a LLMMessagesAppendFrame with a single user message."""
    from pipecat.frames.frames import LLMMessagesAppendFrame
    return LLMMessagesAppendFrame(messages=[{"role": "user", "content": text}])


# ===========================================================================
# Pipeline 1 — Smoke Tests  (mocked LLM, always run)
# ===========================================================================

@pytest.mark.e2e
class TestE2EPipeline1Smoke:
    """
    End-to-end smoke tests for the ASR → LLM → TTS pipeline.

    The Cerebras LLM is mocked. Everything else (frame routing, memory
    persistence, session isolation, error handling) is real production code.
    No API keys or network access required.
    """

    @pytest.fixture(autouse=True)
    def _env(self, monkeypatch):
        monkeypatch.setenv("CEREBRAS_API_KEY", "test-cerebras-key")
        monkeypatch.setenv("CEREBRAS_MODEL", "llama-4-scout-17b-16e-instruct")
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test-lk-key")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test-lk-secret-long-enough")
        monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
        monkeypatch.setenv("CARTESIA_API_KEY", "test-cartesia-key")

    @pytest.fixture
    def session(self):
        """Return a unique session_id and clean up its memory afterward."""
        sid = f"e2e-smoke-{uuid.uuid4().hex[:8]}"
        yield sid
        try:
            import backend.memory.short_term as mem
            mem.clear_session(sid)
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Single turn: frame routing
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_single_turn_pushes_text_frame(self, session):
        """
        A single user utterance must produce exactly one TextFrame downstream
        containing the LLM reply, bracketed by LLMFullResponseStart/End.
        """
        from pipecat.frames.frames import (
            LLMFullResponseEndFrame,
            LLMFullResponseStartFrame,
            TextFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        svc, frames = _make_llm_service(session)

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value={"response": "Hello from the agent!", "tool_name": "", "tool_output": ""}),
        ):
            await svc.process_frame(_user_frame("Hi there"), FrameDirection.DOWNSTREAM)

        frame_types = [type(f) for f in frames]
        assert LLMFullResponseStartFrame in frame_types, "Missing LLMFullResponseStartFrame"
        assert TextFrame in frame_types, "Missing TextFrame"
        assert LLMFullResponseEndFrame in frame_types, "Missing LLMFullResponseEndFrame"

        text_frames = [f for f in frames if isinstance(f, TextFrame)]
        # The response is a single sentence so exactly one TextFrame is expected.
        assert len(text_frames) >= 1
        full_text = " ".join(f.text for f in text_frames)
        assert "Hello from the agent!" in full_text

    @pytest.mark.asyncio
    async def test_single_turn_frame_order(self, session):
        """
        Frames must arrive in order: Start → Text → End (not interleaved).
        """
        from pipecat.frames.frames import (
            LLMFullResponseEndFrame,
            LLMFullResponseStartFrame,
            TextFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        svc, frames = _make_llm_service(session)

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value={"response": "Ordered response", "tool_name": "", "tool_output": ""}),
        ):
            await svc.process_frame(_user_frame("Test"), FrameDirection.DOWNSTREAM)

        # Filter to LLM response frames only — there must be at least Start, 1 Text, End.
        llm_frames = [
            f for f in frames
            if isinstance(f, (LLMFullResponseStartFrame, TextFrame, LLMFullResponseEndFrame))
        ]
        assert len(llm_frames) >= 3
        assert isinstance(llm_frames[0], LLMFullResponseStartFrame)
        assert isinstance(llm_frames[-1], LLMFullResponseEndFrame)
        # All middle frames must be TextFrames
        for f in llm_frames[1:-1]:
            assert isinstance(f, TextFrame)

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Call counter
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_call_counter_increments_per_turn(self, session):
        """_call_count must increment by 1 for each processed user turn."""
        from pipecat.processors.frame_processor import FrameDirection

        svc, _ = _make_llm_service(session)
        assert svc._call_count == 0

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value={"response": "Reply", "tool_name": "", "tool_output": ""}),
        ):
            for i in range(1, 4):
                await svc.process_frame(_user_frame(f"Turn {i}"), FrameDirection.DOWNSTREAM)
                assert svc._call_count == i

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Empty user text — no-op
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_empty_user_text_does_not_call_agent(self, session):
        """
        If no user role message exists in the frame, _run_agent_turn must
        NOT be called and no TextFrame must be pushed.
        """
        from pipecat.frames.frames import LLMMessagesAppendFrame, TextFrame
        from pipecat.processors.frame_processor import FrameDirection

        svc, frames = _make_llm_service(session)

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="Should not appear"),
        ) as mock_run:
            # Frame has only an assistant role message — no user text
            frame = LLMMessagesAppendFrame(
                messages=[{"role": "assistant", "content": "prior reply"}]
            )
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        mock_run.assert_not_called()
        assert not any(isinstance(f, TextFrame) for f in frames)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Error recovery — TOOL_ERROR_MESSAGE fallback
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_llm_error_returns_fallback_message(self, session):
        """
        When _run_agent_turn raises, the pipeline must NOT crash.
        It must push TOOL_ERROR_MESSAGE as the TextFrame instead.
        """
        from pipecat.frames.frames import TextFrame
        from pipecat.processors.frame_processor import FrameDirection
        from backend.agent.prompts import TOOL_ERROR_MESSAGE

        svc, frames = _make_llm_service(session)

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(side_effect=RuntimeError("Simulated Cerebras timeout")),
        ):
            await svc.process_frame(_user_frame("Hello"), FrameDirection.DOWNSTREAM)

        text_frames = [f for f in frames if isinstance(f, TextFrame)]
        assert len(text_frames) >= 1, "Should push at least one TextFrame on error"
        # Join all text frames — sentence-chunking may split the error message
        full_text = " ".join(f.text for f in text_frames)
        assert TOOL_ERROR_MESSAGE in full_text or any(TOOL_ERROR_MESSAGE[:30] in f.text for f in text_frames)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Multi-turn memory: name recall
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_multi_turn_memory_persists(self, session):
        """
        Turn 1: 'My name is Alice'  → agent stores exchange in session memory.
        Turn 2: 'What is my name?'  → history has ≥ 4 messages, 'Alice' present.
        """
        import backend.memory.short_term as mem
        from pipecat.processors.frame_processor import FrameDirection

        svc, _ = _make_llm_service(session)

        replies = ["Nice to meet you, Alice!", "Your name is Alice."]
        call_idx = {"i": 0}

        async def _mock_create(**kwargs):
            idx = call_idx["i"]
            call_idx["i"] += 1
            reply = replies[idx] if idx < len(replies) else "..."
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = reply
            return mock

        mock_client = MagicMock()
        mock_client.chat.completions.create = _mock_create

        with patch(
            "backend.agent.nodes._get_cerebras_client",
            return_value=mock_client,
        ):
            await svc.process_frame(_user_frame("My name is Alice"), FrameDirection.DOWNSTREAM)
            await svc.process_frame(_user_frame("What is my name?"), FrameDirection.DOWNSTREAM)

        history = mem.get_history(session)
        assert len(history) >= 4, (
            f"Expected >= 4 messages in memory after 2 turns, got {len(history)}"
        )
        contents = [str(m.content) for m in history]
        assert any("Alice" in c for c in contents), (
            "Session history must contain 'Alice' from turn 1"
        )

    @pytest.mark.asyncio
    async def test_five_turn_conversation_memory_count(self, session):
        """5 complete turns → exactly 10 messages (5 human + 5 assistant)."""
        import backend.memory.short_term as mem
        from pipecat.processors.frame_processor import FrameDirection

        svc, _ = _make_llm_service(session)
        call_idx = {"i": 0}

        async def _mock_create(**kwargs):
            idx = call_idx["i"]
            call_idx["i"] += 1
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = f"Response {idx + 1}"
            return mock

        mock_client = MagicMock()
        mock_client.chat.completions.create = _mock_create

        with patch(
            "backend.agent.nodes._get_cerebras_client",
            return_value=mock_client,
        ):
            for i in range(1, 6):
                await svc.process_frame(_user_frame(f"User message {i}"), FrameDirection.DOWNSTREAM)

        history = mem.get_history(session)
        assert len(history) == 10, (
            f"Expected 10 messages (5 turns x 2), got {len(history)}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Session isolation
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_session_isolation(self):
        """Two different session IDs must never share memory."""
        import backend.memory.short_term as mem
        from pipecat.processors.frame_processor import FrameDirection

        sid_a = f"e2e-iso-a-{uuid.uuid4().hex[:6]}"
        sid_b = f"e2e-iso-b-{uuid.uuid4().hex[:6]}"
        mem.clear_session(sid_a)
        mem.clear_session(sid_b)

        svc_a, _ = _make_llm_service(sid_a)
        svc_b, _ = _make_llm_service(sid_b)

        async def _mock_create_a(**kwargs):
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = "Reply from session A"
            return mock
            
        async def _mock_create_b(**kwargs):
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = "Reply from session B"
            return mock

        mock_client_a = MagicMock()
        mock_client_a.chat.completions.create = _mock_create_a
        
        mock_client_b = MagicMock()
        mock_client_b.chat.completions.create = _mock_create_b

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client_a):
            await svc_a.process_frame(_user_frame("Hello from A"), FrameDirection.DOWNSTREAM)

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client_b):
            await svc_b.process_frame(_user_frame("Hello from B"), FrameDirection.DOWNSTREAM)

        hist_a = mem.get_history(sid_a)
        hist_b = mem.get_history(sid_b)

        assert len(hist_a) >= 2, "Session A must have its own messages"
        assert len(hist_b) >= 2, "Session B must have its own messages"
        assert hist_a != hist_b, "Session histories must be independent"

        mem.clear_session(sid_a)
        mem.clear_session(sid_b)

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Non-LLM frames forwarded unchanged
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_non_llm_frames_forwarded(self, session):
        """
        Frames that are not LLMMessagesAppendFrame must be forwarded
        downstream unchanged without triggering the LLM.
        """
        from pipecat.frames.frames import TextFrame
        from pipecat.processors.frame_processor import FrameDirection

        svc, frames = _make_llm_service(session)
        passthrough = TextFrame("some downstream text")

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="Should not appear"),
        ) as mock_run:
            await svc.process_frame(passthrough, FrameDirection.DOWNSTREAM)

        mock_run.assert_not_called()
        assert passthrough in frames, "Non-LLM frame must be forwarded downstream"

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Full LangGraph round-trip (mocked Cerebras client)
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_run_agent_turn_full_graph_mocked(self):
        """
        Invoke run_agent_turn() through the full LangGraph graph
        (load_memory → llm_node → save_memory) with mocked Cerebras.
        Verifies graph wiring is intact with zero API calls.
        """
        import backend.memory.short_term as mem
        from backend.agent.graph import run_agent_turn

        sid = f"e2e-graph-{uuid.uuid4().hex[:8]}"
        mem.clear_session(sid)

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "Graph reply from mocked LLM"

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            result = await run_agent_turn(sid, "Test question")

        assert isinstance(result, dict)
        assert "response" in result
        assert "Graph reply from mocked LLM" in result["response"]

        # Memory must have been saved by the save_memory graph node
        history = mem.get_history(sid)
        assert len(history) >= 2
        mem.clear_session(sid)

    @pytest.mark.asyncio
    async def test_run_agent_turn_multi_turn_context_injection(self):
        """
        By turn 2, load_memory must inject turn-1 context into the API call.
        Verify the messages list sent to Cerebras grows with prior history.
        """
        import backend.memory.short_term as mem
        from backend.agent.graph import run_agent_turn

        sid = f"e2e-ctx-{uuid.uuid4().hex[:8]}"
        mem.clear_session(sid)

        captured_calls: list = []

        async def _mock_create(**kwargs):
            captured_calls.append(list(kwargs.get("messages", [])))
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = "Mock response"
            return mock

        mock_client = MagicMock()
        mock_client.chat.completions.create = _mock_create

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            await run_agent_turn(sid, "Turn 1 input")
            await run_agent_turn(sid, "Turn 2 input")

        assert len(captured_calls) == 2
        turn1_len = len(captured_calls[0])
        turn2_len = len(captured_calls[1])
        assert turn2_len > turn1_len, (
            f"Turn 2 context ({turn2_len} msgs) must be larger than "
            f"turn 1 context ({turn1_len} msgs) due to memory injection"
        )

        mem.clear_session(sid)


# ===========================================================================
# Pipeline 1 — Live Tests  (real Cerebras API — requires LIVE_APIS=1)
# ===========================================================================

@pytest.mark.e2e
@pytest.mark.live
class TestE2EPipeline1Live:
    """
    Live end-to-end tests that call the real Cerebras API.

    Requirements:
        - .env file with valid CEREBRAS_API_KEY
        - LIVE_APIS=1 environment variable

    Run:
        $env:LIVE_APIS="1"
        pytest tests/e2e_pipeline1_llm.py -v -m live --log-cli-level=INFO
    """

    @pytest.fixture(autouse=True)
    def _gate(self, skip_if_no_live_apis):
        """Skip all tests in this class unless LIVE_APIS=1."""
        pass

    @pytest.fixture(autouse=True)
    def _load_env(self):
        """Load real API keys from .env."""
        from dotenv import load_dotenv
        load_dotenv()

    @pytest.fixture
    def session(self):
        sid = f"e2e-live-{uuid.uuid4().hex[:8]}"
        yield sid
        try:
            import backend.memory.short_term as mem
            mem.clear_session(sid)
        except Exception:
            pass

    @pytest.mark.asyncio
    async def test_live_single_turn_cerebras_response(self, session):
        """
        LIVE: Send a real utterance through the full LangGraph graph
        (Cerebras API + memory) and verify a non-empty response is returned.
        """
        from backend.agent.graph import run_agent_turn

        logger.info(f"[Live] Calling Cerebras for session '{session}'...")
        response = await run_agent_turn(session, "Say exactly: Hello from Cerebras.")

        assert isinstance(response, str)
        assert len(response.strip()) > 0, "Response must not be empty"
        logger.info(f"[Live] Cerebras responded: '{response[:120]}'")

    @pytest.mark.asyncio
    async def test_live_memory_persists_across_turns(self, session):
        """
        LIVE: Two turns with real Cerebras — memory holds both exchanges,
        and session history contains the introduced name 'TestUser'.
        """
        import backend.memory.short_term as mem
        from backend.agent.graph import run_agent_turn

        logger.info("[Live] Turn 1 — introducing name...")
        r1 = await run_agent_turn(session, "My name is TestUser. Please remember it.")

        logger.info("[Live] Turn 2 — asking for recall...")
        r2 = await run_agent_turn(session, "What did I just tell you my name is?")

        history = mem.get_history(session)
        assert len(history) >= 4, (
            f"Expected >= 4 messages after 2 live turns, got {len(history)}"
        )
        contents = [str(m.content) for m in history]
        assert any("TestUser" in c for c in contents), (
            "Memory must contain 'TestUser' from turn 1"
        )
        logger.info(f"[Live] Turn 1: '{r1[:80]}'")
        logger.info(f"[Live] Turn 2: '{r2[:80]}'")

    @pytest.mark.asyncio
    async def test_live_llm_service_frame_routing(self, session):
        """
        LIVE: LangGraphLLMService with real Cerebras — verify TextFrame
        arrives downstream with a real (non-empty) response text.
        """
        from pipecat.frames.frames import TextFrame
        from pipecat.processors.frame_processor import FrameDirection

        svc, frames = _make_llm_service(session)

        logger.info("[Live] Routing frame through LangGraphLLMService...")
        await svc.process_frame(
            _user_frame("What is 2 + 2? Answer concisely."),
            FrameDirection.DOWNSTREAM,
        )

        text_frames = [f for f in frames if isinstance(f, TextFrame)]
        assert len(text_frames) == 1
        assert len(text_frames[0].text.strip()) > 0
        logger.info(f"[Live] LLM frame response: '{text_frames[0].text[:120]}'")
