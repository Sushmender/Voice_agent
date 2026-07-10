"""
tests/test_memory.py
---------------------
Test Suite — Short-term Memory Module
============================================
Covers every public function in backend/memory/short_term.py.

Test categories
---------------
1. Session lifecycle    — create, get, clear, count
2. Message appending    — add_user_message / add_assistant_message
3. get_history          — returns ordered list of messages
4. get_history_as_dicts — returns OpenAI-compatible dict format
5. Capacity (maxlen)    — deque truncates old messages when maxlen exceeded
6. Multi-session        — sessions are fully isolated from each other
7. Edge cases           — empty content, repeated operations, unicode

Run:
    pytest tests/test_memory.py -v
"""

import os

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


# ── Module under test ────────────────────────────────────────────────────────
import backend.memory.short_term as mem


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    """Provide minimal env vars so Settings() constructs without error."""
    monkeypatch.setenv("CEREBRAS_API_KEY", "test-cerebras-key")
    monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "test-lk-key")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "test-lk-secret")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("CARTESIA_API_KEY", "test-cartesia-key")


@pytest.fixture()
def sid():
    """Return a unique test session ID and clean it up after the test."""
    session_id = "test-session-memory"
    mem.clear_session(session_id)
    yield session_id
    mem.clear_session(session_id)


# ===========================================================================
# 1. Session lifecycle
# ===========================================================================

class TestSessionLifecycle:
    """Tests for session creation, retrieval, clearing, and counting."""

    def test_create_new_session(self, sid):
        """get_or_create_session creates a fresh deque for a new session_id."""
        session = mem.get_or_create_session(sid)
        assert session is not None
        assert len(session) == 0

    def test_get_existing_session_returns_same_object(self, sid):
        """Calling get_or_create_session twice returns the same deque."""
        s1 = mem.get_or_create_session(sid)
        s2 = mem.get_or_create_session(sid)
        assert s1 is s2

    def test_clear_session_removes_data(self, sid):
        """clear_session deletes all messages and removes session from store."""
        mem.add_user_message(sid, "Hello")
        assert mem.get_session_length(sid) == 1

        mem.clear_session(sid)
        assert mem.get_session_length(sid) == 0
        assert mem.get_history(sid) == []

    def test_clear_nonexistent_session_is_noop(self):
        """Clearing a session that doesn't exist should not raise."""
        mem.clear_session("nonexistent-session-xyz")  # must not raise

    def test_session_count_increments(self, sid):
        """session_count() reflects the number of active sessions."""
        initial = mem.session_count()
        mem.get_or_create_session(sid)
        assert mem.session_count() >= initial + 1

    def test_session_count_decrements_on_clear(self, sid):
        """session_count() decrements after clear_session()."""
        mem.get_or_create_session(sid)
        before = mem.session_count()
        mem.clear_session(sid)
        assert mem.session_count() == before - 1

    def test_get_session_length_new_session(self, sid):
        """get_session_length returns 0 for a brand-new session."""
        assert mem.get_session_length(sid) == 0

    def test_get_session_length_nonexistent_returns_zero(self):
        """get_session_length returns 0 for a session that was never created."""
        assert mem.get_session_length("never-existed-xyz") == 0


# ===========================================================================
# 2. Message appending
# ===========================================================================

class TestMessageAppending:
    """Tests for add_user_message and add_assistant_message."""

    def test_add_user_message_creates_human_message(self, sid):
        """add_user_message stores a HumanMessage in session history."""
        mem.add_user_message(sid, "What is the weather?")
        history = mem.get_history(sid)
        assert len(history) == 1
        assert isinstance(history[0], HumanMessage)
        assert history[0].content == "What is the weather?"

    def test_add_assistant_message_creates_ai_message(self, sid):
        """add_assistant_message stores an AIMessage in session history."""
        mem.add_assistant_message(sid, "It's sunny today!")
        history = mem.get_history(sid)
        assert len(history) == 1
        assert isinstance(history[0], AIMessage)
        assert history[0].content == "It's sunny today!"

    def test_messages_are_ordered(self, sid):
        """Messages are stored in insertion order (oldest first)."""
        mem.add_user_message(sid, "First message")
        mem.add_assistant_message(sid, "Second message")
        mem.add_user_message(sid, "Third message")

        history = mem.get_history(sid)
        assert len(history) == 3
        assert history[0].content == "First message"
        assert history[1].content == "Second message"
        assert history[2].content == "Third message"

    def test_multiple_turns_append_correctly(self, sid):
        """Multiple back-and-forth turns accumulate in order."""
        for i in range(3):
            mem.add_user_message(sid, f"User turn {i}")
            mem.add_assistant_message(sid, f"AI turn {i}")

        history = mem.get_history(sid)
        assert len(history) == 6
        assert isinstance(history[0], HumanMessage)
        assert isinstance(history[1], AIMessage)


# ===========================================================================
# 3. get_history
# ===========================================================================

class TestGetHistory:
    """Tests for the get_history() function."""

    def test_empty_session_returns_empty_list(self):
        """get_history returns [] for a session with no messages."""
        assert mem.get_history("history-empty-xyz") == []

    def test_returns_list_not_deque(self, sid):
        """get_history returns a list (not a deque)."""
        mem.add_user_message(sid, "Hello")
        history = mem.get_history(sid)
        assert isinstance(history, list)

    def test_returns_copy_not_reference(self, sid):
        """Mutating the returned list does not affect the session store."""
        mem.add_user_message(sid, "Hello")
        history = mem.get_history(sid)
        history.append(HumanMessage(content="injected"))

        # Original session should be unchanged
        assert mem.get_session_length(sid) == 1


# ===========================================================================
# 4. get_history_as_dicts
# ===========================================================================

class TestGetHistoryAsDicts:
    """Tests for the OpenAI-compatible dict conversion."""

    def test_empty_session_returns_empty_list(self):
        """Returns [] for a session with no history."""
        assert mem.get_history_as_dicts("dicts-empty-xyz") == []

    def test_human_message_role_is_user(self, sid):
        """HumanMessage maps to role='user'."""
        mem.add_user_message(sid, "Hello")
        dicts = mem.get_history_as_dicts(sid)
        assert dicts[0]["role"] == "user"
        assert dicts[0]["content"] == "Hello"

    def test_ai_message_role_is_assistant(self, sid):
        """AIMessage maps to role='assistant'."""
        mem.add_assistant_message(sid, "Hi!")
        dicts = mem.get_history_as_dicts(sid)
        assert dicts[0]["role"] == "assistant"
        assert dicts[0]["content"] == "Hi!"

    def test_multi_turn_dict_format(self, sid):
        """Multi-turn history returns alternating user/assistant dicts."""
        mem.add_user_message(sid, "Question 1")
        mem.add_assistant_message(sid, "Answer 1")
        mem.add_user_message(sid, "Question 2")
        mem.add_assistant_message(sid, "Answer 2")

        dicts = mem.get_history_as_dicts(sid)
        assert len(dicts) == 4
        roles = [d["role"] for d in dicts]
        assert roles == ["user", "assistant", "user", "assistant"]

    def test_each_dict_has_role_and_content_keys(self, sid):
        """Each dict in the result has exactly 'role' and 'content' keys."""
        mem.add_user_message(sid, "Test")
        mem.add_assistant_message(sid, "Reply")
        dicts = mem.get_history_as_dicts(sid)
        for d in dicts:
            assert set(d.keys()) == {"role", "content"}


# ===========================================================================
# 5. Capacity (maxlen)
# ===========================================================================

class TestCapacity:
    """Tests for the deque maxlen truncation behaviour."""

    def test_old_messages_evicted_when_full(self, monkeypatch, sid):
        """When maxlen is reached, oldest messages are evicted."""
        # Override max_session_history to a small value for testing
        monkeypatch.setenv("MAX_SESSION_HISTORY", "4")
        from collections import deque
        import backend.memory.short_term as _mem
        _mem._sessions[sid] = deque(maxlen=4)

        for i in range(6):
            mem.add_user_message(sid, f"Message {i}")

        history = mem.get_history(sid)
        # Only the last 4 messages should remain
        assert len(history) == 4
        assert history[0].content == "Message 2"
        assert history[-1].content == "Message 5"

    def test_maxlen_does_not_lose_recent_messages(self, monkeypatch, sid):
        """Most recent messages are never evicted before older ones."""
        from collections import deque
        import backend.memory.short_term as _mem
        _mem._sessions[sid] = deque(maxlen=2)

        mem.add_user_message(sid, "Old message")
        mem.add_user_message(sid, "New message 1")
        mem.add_user_message(sid, "New message 2")

        history = mem.get_history(sid)
        assert len(history) == 2
        contents = [m.content for m in history]
        assert "New message 1" in contents
        assert "New message 2" in contents
        assert "Old message" not in contents


# ===========================================================================
# 6. Multi-session isolation
# ===========================================================================

class TestMultiSessionIsolation:
    """Sessions must be entirely independent of each other."""

    def test_two_sessions_dont_share_messages(self):
        """Messages added to session A must not appear in session B."""
        sid_a = "isolation-test-a"
        sid_b = "isolation-test-b"
        mem.clear_session(sid_a)
        mem.clear_session(sid_b)

        mem.add_user_message(sid_a, "Message for A")
        mem.add_user_message(sid_b, "Message for B")

        hist_a = mem.get_history(sid_a)
        hist_b = mem.get_history(sid_b)

        assert len(hist_a) == 1
        assert hist_a[0].content == "Message for A"
        assert len(hist_b) == 1
        assert hist_b[0].content == "Message for B"

        mem.clear_session(sid_a)
        mem.clear_session(sid_b)

    def test_clearing_one_session_does_not_affect_another(self):
        """Clearing session A must leave session B intact."""
        sid_a = "clear-a"
        sid_b = "clear-b"
        mem.clear_session(sid_a)
        mem.clear_session(sid_b)

        mem.add_user_message(sid_a, "Hello A")
        mem.add_user_message(sid_b, "Hello B")

        mem.clear_session(sid_a)

        assert mem.get_session_length(sid_a) == 0
        assert mem.get_session_length(sid_b) == 1

        mem.clear_session(sid_b)


# ===========================================================================
# 7. Edge cases
# ===========================================================================

class TestEdgeCases:
    """Edge cases: empty string, unicode, long messages."""

    def test_empty_string_message_is_stored(self, sid):
        """Empty string content is a valid message (doesn't raise)."""
        mem.add_user_message(sid, "")
        history = mem.get_history(sid)
        assert len(history) == 1
        assert history[0].content == ""

    def test_unicode_message_stored_correctly(self, sid):
        """Unicode text (emoji, non-ASCII) is stored and retrieved intact."""
        text = "Hello 🌍! こんにちは. Привет. مرحبا."
        mem.add_user_message(sid, text)
        history = mem.get_history(sid)
        assert history[0].content == text

    def test_long_message_stored_correctly(self, sid):
        """Very long messages (>1000 chars) are stored without truncation."""
        long_text = "A" * 2000
        mem.add_user_message(sid, long_text)
        history = mem.get_history(sid)
        assert len(history[0].content) == 2000

    def test_multiple_clears_are_safe(self, sid):
        """Calling clear_session multiple times on the same session is safe."""
        mem.add_user_message(sid, "Hello")
        mem.clear_session(sid)
        mem.clear_session(sid)  # second clear — must not raise
        assert mem.get_session_length(sid) == 0

    def test_add_after_clear_works(self, sid):
        """After clearing a session, new messages can still be added."""
        mem.add_user_message(sid, "Before clear")
        mem.clear_session(sid)
        mem.add_user_message(sid, "After clear")

        history = mem.get_history(sid)
        assert len(history) == 1
        assert history[0].content == "After clear"
