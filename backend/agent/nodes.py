"""
backend/agent/nodes.py
----------------------
LangGraph node functions for the voice AI agent.

Nodes
-----
load_memory  : Pull conversation history from short-term memory into AgentState.
llm_node     : Call Cerebras LLM (OpenAI-compatible API) to generate a response.
save_memory  : Persist the new human + assistant messages back to short-term memory.

Cerebras uses an OpenAI-compatible REST API, so we use the `openai` client
pointed at the Cerebras base URL. No custom SDK needed.
"""
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from backend.agent.prompts import FALLBACK_MESSAGE, TOOL_ERROR_MESSAGE, VOICE_AGENT_SYSTEM_PROMPT
from backend.agent.state import AgentState
from backend.config import get_settings
import backend.memory.short_term as memory

logger = logging.getLogger(__name__)


def _get_cerebras_client():
    """Return an openai.AsyncOpenAI client pointed at the Cerebras API."""
    import openai

    settings = get_settings()
    return openai.AsyncOpenAI(
        api_key=settings.cerebras_api_key,
        base_url=settings.cerebras_base_url,
    )


def load_memory(state: AgentState) -> dict[str, Any]:
    """
    Node: load_memory
    -----------------
    Retrieve short-term session history and append the latest user utterance.
    This guarantees chronological order: [old1, old2, ..., new_user_msg].
    """
    session_id = state.get("session_id", "default")
    user_input = state.get("user_input", "")
    
    history = memory.get_history(session_id)
    if user_input:
        history.append(HumanMessage(content=user_input))
        
    logger.debug(
        f"[load_memory] Session '{session_id}': loaded {len(history)} messages"
    )
    return {"messages": history}


async def llm_node(state: AgentState) -> dict[str, Any]:
    """
    Node: llm_node
    --------------
    Call the Cerebras LLM to generate a response given the current conversation.

    Builds an OpenAI-compatible messages list from:
        [SystemMessage, ...history, last HumanMessage]

    The response text is stored in state["response"] for downstream use
    (TTS pickup), and also appended as an AIMessage to state["messages"].

    Args:
        state: Current AgentState with messages populated.

    Returns:
        Partial state dict with `response` and an appended AIMessage.
    """
    settings = get_settings()
    session_id = state.get("session_id", "default")
    messages = list(state.get("messages", []))

    # ── Build the messages list for the Cerebras API ──────────────────────────
    api_messages = [{"role": "system", "content": VOICE_AGENT_SYSTEM_PROMPT}]

    for msg in messages:
        if isinstance(msg, HumanMessage):
            api_messages.append({"role": "user", "content": str(msg.content)})
        elif isinstance(msg, AIMessage):
            api_messages.append({"role": "assistant", "content": str(msg.content)})
        elif isinstance(msg, SystemMessage):
            # Skip — system prompt already prepended above
            pass

    if not api_messages or api_messages[-1]["role"] != "user":
        # No user message — return fallback
        logger.warning(
            f"[llm_node] Session '{session_id}': no user message found, "
            "returning fallback."
        )
        return {
            "response": FALLBACK_MESSAGE,
            "messages": [AIMessage(content=FALLBACK_MESSAGE)],
        }

    logger.info(
        f"[llm_node] Session '{session_id}': calling Cerebras "
        f"({settings.cerebras_model}) with {len(api_messages)} messages"
    )

    # ── Call Cerebras ─────────────────────────────────────────────────────────
    try:
        client = _get_cerebras_client()
        completion = await client.chat.completions.create(
            model=settings.cerebras_model,
            messages=api_messages,
            max_tokens=256,     # keep responses short for voice
            temperature=0.7,
        )
        response_text = completion.choices[0].message.content.strip()

        logger.info(
            f"[llm_node] Session '{session_id}': response = '{response_text[:80]}...'"
        )
    except Exception as exc:
        logger.error(
            f"[llm_node] Cerebras API error for session '{session_id}': {exc}",
            exc_info=True,
        )
        response_text = TOOL_ERROR_MESSAGE

    return {
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }


def save_memory(state: AgentState) -> dict[str, Any]:
    """
    Node: save_memory
    -----------------
    Persist the latest human + assistant message exchange to short-term memory.

    Walks the messages list to find the last HumanMessage and last AIMessage
    and writes them to the session store.

    Args:
        state: Current AgentState (messages fully populated after llm_node).

    Returns:
        Empty dict (no state mutation needed — side-effect node).
    """
    session_id = state.get("session_id", "default")
    messages = list(state.get("messages", []))

    last_human: str | None = None
    last_ai: str | None = None

    for msg in reversed(messages):
        if last_ai is None and isinstance(msg, AIMessage):
            last_ai = str(msg.content)
        elif last_human is None and isinstance(msg, HumanMessage):
            last_human = str(msg.content)
        if last_human is not None and last_ai is not None:
            break

    if last_human:
        memory.add_user_message(session_id, last_human)
    if last_ai:
        memory.add_assistant_message(session_id, last_ai)

    turn_count = memory.get_session_length(session_id)
    logger.debug(
        f"[save_memory] Session '{session_id}': saved turn "
        f"(total messages in memory: {turn_count})"
    )
    return {}
