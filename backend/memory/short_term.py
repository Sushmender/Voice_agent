"""
backend/memory/short_term.py
-----------------------------
Session-scoped short-term memory manager.
Populated when LangGraph is wired in.

Uses a dictionary keyed by session_id to maintain per-session chat history.
Each session stores the last N conversation turns (configurable via MAX_SESSION_HISTORY).
"""
import logging
from collections import deque
from typing import Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from backend.config import get_settings

settings = get_settings()


logger = logging.getLogger(__name__)

# In-memory session store: {session_id: deque of BaseMessage}
_sessions: Dict[str, deque] = {}


def get_or_create_session(session_id: str) -> deque:
    """
    Return the message deque for a session, creating it if it doesn't exist.

    Args:
        session_id: Unique session identifier (e.g., LiveKit room name).

    Returns:
        Deque of BaseMessage objects for this session.
    """
    if session_id not in _sessions:
        _sessions[session_id] = deque(maxlen=settings.max_session_history)
        logger.info(f"[Memory] Created new session: '{session_id}'")
    return _sessions[session_id]


def add_user_message(session_id: str, content: str) -> None:
    """Append a user (human) message to the session history."""
    session = get_or_create_session(session_id)
    session.append(HumanMessage(content=content))
    logger.debug(f"[Memory] [{session_id}] User: {content[:60]}...")


def add_assistant_message(session_id: str, content: str) -> None:
    """Append an assistant (AI) message to the session history."""
    session = get_or_create_session(session_id)
    session.append(AIMessage(content=content))
    logger.debug(f"[Memory] [{session_id}] Assistant: {content[:60]}...")


def get_history(session_id: str) -> List[BaseMessage]:
    """
    Return the full conversation history for a session.

    Args:
        session_id: Session to retrieve history for.

    Returns:
        List of BaseMessage objects (oldest first).
    """
    if session_id not in _sessions:
        return []
    return list(_sessions[session_id])


def get_history_as_dicts(session_id: str) -> List[dict]:
    """
    Return conversation history as a list of OpenAI-compatible dicts.
    Useful for passing directly to the Cerebras API.

    Returns:
        List of {"role": "user"|"assistant", "content": str} dicts.
    """
    history = get_history(session_id)
    result = []
    for msg in history:
        if isinstance(msg, HumanMessage):
            result.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            result.append({"role": "assistant", "content": msg.content})
        elif isinstance(msg, SystemMessage):
            result.append({"role": "system", "content": msg.content})
    return result


def clear_session(session_id: str) -> None:
    """
    Remove a session from memory (e.g., when user disconnects).

    Args:
        session_id: Session to clear.
    """
    if session_id in _sessions:
        del _sessions[session_id]
        logger.info(f"[Memory] Cleared session: '{session_id}'")


def session_count() -> int:
    """Return number of active sessions (for monitoring)."""
    return len(_sessions)


def get_session_length(session_id: str) -> int:
    """Return number of messages in a session."""
    if session_id not in _sessions:
        return 0
    return len(_sessions[session_id])
