"""
tests/test_agent.py
--------------------
Day 3 Test Suite — LangGraph Agent + Cerebras LLM
==================================================
Tests every Day 3 checklist item that can be verified without real API calls
or a live LiveKit room.

Test categories
---------------
1. AgentState           — TypedDict structure and field defaults
2. LangGraph graph      — node wiring, topology, compilation
3. nodes.py             — load_memory / save_memory unit tests
4. llm_node             — Cerebras API call (mocked)
5. LangGraphLLMService  — pipecat frame processing (mocked graph)
6. run_agent_turn       — end-to-end convenience wrapper (mocked)
7. Day 3 milestone      — multi-turn memory scenario (mocked LLM)

Run:
    pytest tests/test_agent.py -v
"""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    """Provide minimal env vars so Settings() constructs without error."""
    monkeypatch.setenv("CEREBRAS_API_KEY", "test-cerebras-key")
    monkeypatch.setenv("CEREBRAS_MODEL", "llama-4-scout-17b-16e-instruct")
    monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "test-lk-key")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "test-lk-secret")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("CARTESIA_API_KEY", "test-cartesia-key")


# ===========================================================================
# 1. AgentState — TypedDict structure
# ===========================================================================

class TestAgentState:
    """Verify AgentState has the correct fields and types."""

    def test_agent_state_fields(self):
        """AgentState TypedDict must have the four required fields."""
        from backend.agent.state import AgentState
        hints = AgentState.__annotations__
        assert "messages" in hints, "AgentState must have 'messages' field"
        assert "session_id" in hints, "AgentState must have 'session_id' field"
        assert "tool_output" in hints, "AgentState must have 'tool_output' field"
        assert "response" in hints, "AgentState must have 'response' field"

    def test_agent_state_instantiation(self):
        """AgentState can be constructed as a plain dict."""
        from langchain_core.messages import HumanMessage
        from backend.agent.state import AgentState

        state: AgentState = {
            "messages": [HumanMessage(content="Hello")],
            "session_id": "test-session",
            "tool_output": "",
            "response": "",
        }
        assert state["session_id"] == "test-session"
        assert len(state["messages"]) == 1


# ===========================================================================
# 2. LangGraph graph — topology & compilation
# ===========================================================================

class TestAgentGraph:
    """Verify graph structure: nodes registered, edges correct, compiles clean."""

    def test_graph_compiles(self):
        """build_agent_graph() must return a compiled graph without error."""
        from backend.agent.graph import build_agent_graph
        graph = build_agent_graph()
        assert graph is not None

    def test_graph_singleton(self):
        """get_agent_graph() returns the same object on repeated calls."""
        # Reset the module-level singleton so we start fresh
        import backend.agent.graph as g
        g._compiled_graph = None

        from backend.agent.graph import get_agent_graph
        g1 = get_agent_graph()
        g2 = get_agent_graph()
        assert g1 is g2

    def test_graph_has_expected_nodes(self):
        """Graph must register load_memory, llm_node, save_memory nodes."""
        from backend.agent.graph import build_agent_graph
        graph = build_agent_graph()
        # LangGraph compiled graph exposes its nodes via graph.nodes or
        # graph.graph.nodes depending on version — try both
        try:
            node_names = set(graph.graph.nodes.keys())
        except AttributeError:
            node_names = set(graph.nodes.keys())

        assert "load_memory" in node_names
        assert "llm_node" in node_names
        assert "save_memory" in node_names


# ===========================================================================
# 3. nodes.py — load_memory / save_memory (unit, no LLM calls)
# ===========================================================================

class TestMemoryNodes:
    """Unit tests for load_memory and save_memory nodes."""

    def _fresh_state(self, session_id: str = "test-room") -> dict:
        from langchain_core.messages import HumanMessage
        return {
            "messages": [HumanMessage(content="Hello")],
            "session_id": session_id,
            "tool_output": "",
            "response": "",
        }

    def test_load_memory_empty_session(self):
        """load_memory returns empty messages list when session has no history."""
        import backend.memory.short_term as mem
        from backend.agent.nodes import load_memory

        session_id = "load-empty-test"
        mem.clear_session(session_id)

        state = self._fresh_state(session_id)
        result = load_memory(state)

        assert "messages" in result
        assert result["messages"] == []

    def test_load_memory_existing_session(self):
        """load_memory retrieves previously saved messages."""
        import backend.memory.short_term as mem
        from backend.agent.nodes import load_memory

        session_id = "load-existing-test"
        mem.clear_session(session_id)
        mem.add_user_message(session_id, "What is 2+2?")
        mem.add_assistant_message(session_id, "Four.")

        state = self._fresh_state(session_id)
        result = load_memory(state)

        assert len(result["messages"]) == 2

    def test_save_memory_persists_messages(self):
        """save_memory writes the last human + AI message pair to memory."""
        import backend.memory.short_term as mem
        from backend.agent.nodes import save_memory
        from langchain_core.messages import AIMessage, HumanMessage

        session_id = "save-test"
        mem.clear_session(session_id)

        state = {
            "messages": [
                HumanMessage(content="My name is Alice"),
                AIMessage(content="Nice to meet you, Alice!"),
            ],
            "session_id": session_id,
            "tool_output": "",
            "response": "Nice to meet you, Alice!",
        }
        result = save_memory(state)

        # save_memory should return an empty dict (side-effect only)
        assert result == {}
        # Memory should now have 2 messages
        history = mem.get_history(session_id)
        assert len(history) == 2

    def test_save_memory_only_saves_last_pair(self):
        """save_memory only saves the latest human/AI pair, not duplicates."""
        import backend.memory.short_term as mem
        from backend.agent.nodes import save_memory
        from langchain_core.messages import AIMessage, HumanMessage

        session_id = "save-dedup-test"
        mem.clear_session(session_id)

        # Pre-populate memory with turn 1
        mem.add_user_message(session_id, "Hello")
        mem.add_assistant_message(session_id, "Hi there!")

        # State only has turn 2 (the new exchange)
        state = {
            "messages": [
                HumanMessage(content="What time is it?"),
                AIMessage(content="I don't have a clock, sorry!"),
            ],
            "session_id": session_id,
            "tool_output": "",
            "response": "I don't have a clock, sorry!",
        }
        save_memory(state)

        # Total in memory: turn1 (2 msgs) + turn2 (2 msgs) = 4
        history = mem.get_history(session_id)
        assert len(history) == 4


# ===========================================================================
# 4. llm_node — Cerebras API (mocked)
# ===========================================================================

class TestLlmNode:
    """Test llm_node with a mocked Cerebras API client."""

    @pytest.mark.asyncio
    async def test_llm_node_returns_response(self):
        """llm_node should call Cerebras and return response in state."""
        from langchain_core.messages import HumanMessage

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "  Hello, how can I help you?  "

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            from backend.agent.nodes import llm_node

            state = {
                "messages": [HumanMessage(content="Hello!")],
                "session_id": "llm-test",
                "tool_output": "",
                "response": "",
            }
            result = await llm_node(state)

        assert result["response"] == "Hello, how can I help you?"
        assert len(result["messages"]) == 1  # one AIMessage added

    @pytest.mark.asyncio
    async def test_llm_node_fallback_on_no_user_message(self):
        """llm_node returns FALLBACK_MESSAGE when no HumanMessage in state."""
        from langchain_core.messages import AIMessage
        from backend.agent.prompts import FALLBACK_MESSAGE
        from backend.agent.nodes import llm_node

        state = {
            "messages": [AIMessage(content="Prior assistant turn")],
            "session_id": "fallback-test",
            "tool_output": "",
            "response": "",
        }
        result = await llm_node(state)
        assert result["response"] == FALLBACK_MESSAGE

    @pytest.mark.asyncio
    async def test_llm_node_error_returns_tool_error(self):
        """llm_node returns TOOL_ERROR_MESSAGE when Cerebras raises an exception."""
        from langchain_core.messages import HumanMessage
        from backend.agent.prompts import TOOL_ERROR_MESSAGE

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=RuntimeError("API timeout")
        )

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            from backend.agent.nodes import llm_node

            state = {
                "messages": [HumanMessage(content="Something")],
                "session_id": "error-test",
                "tool_output": "",
                "response": "",
            }
            result = await llm_node(state)

        assert result["response"] == TOOL_ERROR_MESSAGE

    @pytest.mark.asyncio
    async def test_llm_node_includes_system_prompt(self):
        """llm_node should prepend the system prompt as the first message."""
        from langchain_core.messages import HumanMessage
        from backend.agent.prompts import VOICE_AGENT_SYSTEM_PROMPT
        from backend.agent.nodes import llm_node

        captured_messages = []

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "test response"

        async def _capture_and_return(*args, **kwargs):
            captured_messages.extend(kwargs.get("messages", []))
            return mock_completion

        mock_create = AsyncMock(side_effect=_capture_and_return)
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            state = {
                "messages": [HumanMessage(content="Hi!")],
                "session_id": "prompt-test",
                "tool_output": "",
                "response": "",
            }
            await llm_node(state)

        assert len(captured_messages) > 0, "No messages were captured by mock"
        assert captured_messages[0]["role"] == "system"
        assert captured_messages[0]["content"] == VOICE_AGENT_SYSTEM_PROMPT


# ===========================================================================
# 5. LangGraphLLMService — pipecat frame processing
# ===========================================================================

class TestLangGraphLLMService:
    """Test the pipecat frame processor that wraps the LangGraph agent."""

    def _make_service(self, session_id="test-room") -> object:
        from backend.pipeline.voice_pipeline import LangGraphLLMService
        svc = LangGraphLLMService(session_id=session_id)

        pushed_frames = []

        async def _mock_push(frame, direction=None):
            pushed_frames.append(frame)

        svc.push_frame = _mock_push
        svc._pushed_frames = pushed_frames
        return svc

    @pytest.mark.asyncio
    async def test_frame_processor_pushes_text_frame(self):
        """LangGraphLLMService pushes TextFrame with LLM response on user input."""
        from pipecat.frames.frames import LLMMessagesAppendFrame, TextFrame

        svc = self._make_service()

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="Hello from LangGraph!"),
        ):
            frame = LLMMessagesAppendFrame(
                messages=[{"role": "user", "content": "Hi there"}]
            )
            from pipecat.processors.frame_processor import FrameDirection
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        text_frames = [
            f for f in svc._pushed_frames if isinstance(f, TextFrame)
        ]
        assert len(text_frames) == 1
        assert text_frames[0].text == "Hello from LangGraph!"

    @pytest.mark.asyncio
    async def test_frame_processor_pushes_start_end_frames(self):
        """LangGraphLLMService must push LLMFullResponseStart/End frames."""
        from pipecat.frames.frames import (
            LLMFullResponseEndFrame,
            LLMFullResponseStartFrame,
            LLMMessagesAppendFrame,
        )

        svc = self._make_service()

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="A response"),
        ):
            frame = LLMMessagesAppendFrame(
                messages=[{"role": "user", "content": "Hello there"}]
            )
            from pipecat.processors.frame_processor import FrameDirection
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        types = [type(f) for f in svc._pushed_frames]
        assert LLMFullResponseStartFrame in types
        assert LLMFullResponseEndFrame in types

    @pytest.mark.asyncio
    async def test_frame_processor_skips_empty_user_text(self):
        """LangGraphLLMService does nothing if no user text in frame."""
        from pipecat.frames.frames import LLMMessagesAppendFrame, TextFrame

        svc = self._make_service()

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="Should not appear"),
        ) as mock_run:
            frame = LLMMessagesAppendFrame(
                messages=[{"role": "assistant", "content": "prior turn"}]
            )
            from pipecat.processors.frame_processor import FrameDirection
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        mock_run.assert_not_called()
        text_frames = [f for f in svc._pushed_frames if isinstance(f, TextFrame)]
        assert len(text_frames) == 0

    @pytest.mark.asyncio
    async def test_frame_processor_increments_call_count(self):
        """LangGraphLLMService _call_count increments per LLM turn."""
        from pipecat.frames.frames import LLMMessagesAppendFrame
        from pipecat.processors.frame_processor import FrameDirection

        svc = self._make_service()
        assert svc._call_count == 0

        with patch(
            "backend.pipeline.voice_pipeline._run_agent_turn",
            new=AsyncMock(return_value="Reply"),
        ):
            frame = LLMMessagesAppendFrame(
                messages=[{"role": "user", "content": "Turn 1"}]
            )
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)
            await svc.process_frame(frame, FrameDirection.DOWNSTREAM)

        assert svc._call_count == 2


# ===========================================================================
# 6. run_agent_turn — convenience wrapper (mocked)
# ===========================================================================

class TestRunAgentTurn:
    """Test the run_agent_turn() wrapper with a mocked Cerebras client."""

    @pytest.mark.asyncio
    async def test_run_agent_turn_returns_string(self):
        """run_agent_turn() must return a plain string."""
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "I'm doing great!"

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        import backend.memory.short_term as mem
        mem.clear_session("rat-test")

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            from backend.agent.graph import run_agent_turn
            result = await run_agent_turn("rat-test", "How are you?")

        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_run_agent_turn_updates_memory(self):
        """run_agent_turn() must persist the exchange to short-term memory."""
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "Your name is Bob."

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        import backend.memory.short_term as mem
        mem.clear_session("memory-turn-test")

        with patch("backend.agent.nodes._get_cerebras_client", return_value=mock_client):
            from backend.agent.graph import run_agent_turn
            await run_agent_turn("memory-turn-test", "My name is Bob")

        history = mem.get_history("memory-turn-test")
        assert len(history) >= 2  # at least one user + one assistant message


# ===========================================================================
# 7. Day 3 Milestone — multi-turn memory scenario (mocked LLM)
# ===========================================================================

class TestDay3Milestone:
    """
    Simulate the Day 3 milestone acceptance scenarios:
    - Turn 1: \"My name is Alice\" → agent acknowledges
    - Turn 2: \"What is my name?\" → agent recalls \"Alice\"
    - Turn 5+: conversation context maintained

    The Cerebras client is mocked; we verify memory mechanics, not LLM quality.
    """

    @pytest.fixture(autouse=True)
    def _clear_session(self):
        """Ensure a clean session for each milestone test."""
        import backend.memory.short_term as mem
        mem.clear_session("milestone-session")
        yield
        mem.clear_session("milestone-session")

    def _mock_client(self, replies: list[str]):
        """Build an AsyncMock Cerebras client that returns replies in sequence."""
        call_index = {"i": 0}

        async def _create(**kwargs):
            idx = call_index["i"]
            call_index["i"] += 1
            reply = replies[idx] if idx < len(replies) else "I'm not sure."
            mock = MagicMock()
            mock.choices = [MagicMock()]
            mock.choices[0].message.content = reply
            return mock

        client = AsyncMock()
        client.chat.completions.create = _create
        return client

    @pytest.mark.asyncio
    async def test_agent_acknowledges_name(self):
        """Turn 1: 'My name is Alice' → agent returns an acknowledgement."""
        client = self._mock_client(["Nice to meet you, Alice!"])

        with patch("backend.agent.nodes._get_cerebras_client", return_value=client):
            from backend.agent.graph import run_agent_turn
            response = await run_agent_turn("milestone-session", "My name is Alice")

        assert isinstance(response, str)
        assert len(response) > 0

    @pytest.mark.asyncio
    async def test_memory_carries_name_across_turns(self):
        """Turns 1→2: name introduced in turn 1 is present in history by turn 2."""
        import backend.memory.short_term as mem

        client = self._mock_client([
            "Nice to meet you, Alice!",
            "Your name is Alice.",
        ])

        with patch("backend.agent.nodes._get_cerebras_client", return_value=client):
            from backend.agent.graph import run_agent_turn

            await run_agent_turn("milestone-session", "My name is Alice")
            await run_agent_turn("milestone-session", "What is my name?")

        history = mem.get_history("milestone-session")
        # Must have at least 4 messages (2 human + 2 assistant)
        assert len(history) >= 4

        contents = [str(m.content) for m in history]
        assert any("Alice" in c for c in contents), \
            "Session history must contain 'Alice' from earlier turn"

    @pytest.mark.asyncio
    async def test_five_turn_conversation_context(self):
        """5-turn conversation: memory holds all turns without truncation."""
        import backend.memory.short_term as mem

        replies = [f"Response {i}" for i in range(1, 6)]
        client = self._mock_client(replies)

        with patch("backend.agent.nodes._get_cerebras_client", return_value=client):
            from backend.agent.graph import run_agent_turn

            for i in range(1, 6):
                await run_agent_turn("milestone-session", f"User message {i}")

        history = mem.get_history("milestone-session")
        # 5 human + 5 assistant = 10 messages (well within maxlen=20)
        assert len(history) == 10

    @pytest.mark.asyncio
    async def test_session_isolation(self):
        """Different session_ids must not share memory."""
        import backend.memory.short_term as mem
        mem.clear_session("session-a")
        mem.clear_session("session-b")

        client_a = self._mock_client(["Hello from session A!"])
        client_b = self._mock_client(["Hello from session B!"])

        with patch("backend.agent.nodes._get_cerebras_client", return_value=client_a):
            from backend.agent.graph import run_agent_turn
            await run_agent_turn("session-a", "Hello")

        with patch("backend.agent.nodes._get_cerebras_client", return_value=client_b):
            await run_agent_turn("session-b", "Hello")

        hist_a = mem.get_history("session-a")
        hist_b = mem.get_history("session-b")

        assert len(hist_a) >= 2
        assert len(hist_b) >= 2
        # Histories must be independent
        assert hist_a != hist_b

        mem.clear_session("session-a")
        mem.clear_session("session-b")
