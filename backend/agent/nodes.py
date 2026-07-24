"""
backend/agent/nodes.py
----------------------
LangGraph node functions for the voice AI agent.

Nodes
-------------
load_memory             : Pull conversation history into AgentState.
llm_node                : Call Cerebras LLM; detect tool-call intent via
                          OpenAI function-calling (with prompt fallback).
tool_node               : Execute the requested tool and store result.
format_tool_response    : Re-call LLM with tool output to produce final answer.
save_memory             : Persist the new exchange back to short-term memory.

Cerebras uses an OpenAI-compatible REST API, so we use the `openai` client
pointed at the Cerebras base URL.
"""
import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from backend.agent.prompts import FALLBACK_MESSAGE, TOOL_ERROR_MESSAGE, VOICE_AGENT_SYSTEM_PROMPT
from backend.agent.state import AgentState
from backend.config import get_settings
from backend.db.mongodb import get_database
import backend.memory.short_term as memory
import asyncio

logger = logging.getLogger(__name__)

# ── Tool schema (OpenAI function-calling format) ──────────────────────────────
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name, e.g. 'Paris'"},
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a mathematical expression. Use for any arithmetic, algebra, or math calculations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression, e.g. '13 * 19' or 'sqrt(144)'",
                    },
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web using DuckDuckGo for current information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {
                        "type": "integer",
                        "description": "Number of results (default 3)",
                        "default": 3,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_note",
            "description": "Save a personal note to Notion.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Short title/summary of the note"},
                    "content": {"type": "string", "description": "Full note content"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": "Search personal notes saved in Notion.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_notes",
            "description": "List the most recently saved Notion notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Max notes to list (default 5)",
                        "default": 5,
                    },
                },
                "required": [],
            },
        },
    },
]


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
    """
    session_id = state.get("session_id", "default")
    user_input = state.get("user_input", "")
    # Use the clean display text for the in-memory HumanMessage so short-term
    # memory never contains the [System Note:...] barge-in decoration.
    display_input = state.get("display_user_input", "") or user_input

    history = memory.get_history(session_id)
    if display_input:
        history.append(HumanMessage(content=display_input))

    logger.debug(
        f"[load_memory] Session '{session_id}': loaded {len(history)} messages"
    )
    return {"messages": history, "tool_name": "", "tool_args": {}, "tool_output": ""}


async def llm_node(state: AgentState) -> dict[str, Any]:
    """
    Node: llm_node
    --------------
    Call the Cerebras LLM with tool schemas.

    If the LLM returns a tool_call → store tool_name + tool_args in state.
    If the LLM returns a plain text response → store as response directly.

    Returns:
        Partial state dict with tool_name/tool_args OR response populated.
    """
    settings = get_settings()
    session_id = state.get("session_id", "default")
    messages = list(state.get("messages", []))

    user_name = state.get("user_name", "User")
    system_prompt = VOICE_AGENT_SYSTEM_PROMPT + f"\n\nYou are speaking with {user_name}. (You don't need to use their name every time, just be aware of who they are)."

    # Build the messages list for the Cerebras API
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if isinstance(msg, HumanMessage):
            api_messages.append({"role": "user", "content": str(msg.content)})
        elif isinstance(msg, AIMessage):
            api_messages.append({"role": "assistant", "content": str(msg.content)})
        elif isinstance(msg, SystemMessage):
            pass  # system prompt already prepended

    if not api_messages or api_messages[-1]["role"] != "user":
        logger.warning(f"[llm_node] Session '{session_id}': no user message, returning fallback.")
        return {
            "response": FALLBACK_MESSAGE,
            "messages": [AIMessage(content=FALLBACK_MESSAGE)],
            "tool_name": "",
            "tool_args": {},
        }

    logger.info(
        f"[llm_node] Session '{session_id}': calling Cerebras "
        f"({settings.cerebras_model}) with {len(api_messages)} messages"
    )

    try:
        client = _get_cerebras_client()

        # Try with tool-calling first
        try:
            completion = await client.chat.completions.create(
                model=settings.cerebras_model,
                messages=api_messages,
                tools=TOOLS_SCHEMA,
                tool_choice="auto",
                max_tokens=512,
                temperature=0.7,
            )

            choice = completion.choices[0]
            finish_reason = choice.finish_reason

            # ── Tool call branch ──────────────────────────────────────────────
            if finish_reason == "tool_calls" and choice.message.tool_calls:
                tool_call = choice.message.tool_calls[0]
                tool_name = tool_call.function.name
                try:
                    tool_args = json.loads(tool_call.function.arguments)
                except (json.JSONDecodeError, TypeError):
                    tool_args = {}

                logger.info(
                    f"[llm_node] Session '{session_id}': tool_call → "
                    f"{tool_name}({tool_args})"
                )
                return {
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "response": "",
                    "messages": [],
                }

            # ── Direct response branch ────────────────────────────────────────
            response_text = (choice.message.content or "").strip()

        except Exception as tool_err:
            # Cerebras may not support tools= yet — fall back to plain call
            logger.warning(
                f"[llm_node] Tool-calling failed ({tool_err}), falling back to plain call."
            )
            completion = await client.chat.completions.create(
                model=settings.cerebras_model,
                messages=api_messages,
                max_tokens=256,
                temperature=0.7,
            )
            response_text = completion.choices[0].message.content.strip()

        logger.info(f"[llm_node] Session '{session_id}': response = '{response_text[:80]}'")
        return {
            "response": response_text,
            "messages": [AIMessage(content=response_text)],
            "tool_name": "",
            "tool_args": {},
        }

    except Exception as exc:
        logger.error(
            f"[llm_node] Cerebras API error for session '{session_id}': {exc}",
            exc_info=True,
        )
        return {
            "response": TOOL_ERROR_MESSAGE,
            "messages": [AIMessage(content=TOOL_ERROR_MESSAGE)],
            "tool_name": "",
            "tool_args": {},
        }


async def tool_node(state: AgentState) -> dict[str, Any]:
    """
    Node: tool_node
    ---------------
    Execute the tool named in state["tool_name"] with state["tool_args"].
    Store the result in state["tool_output"].

    Returns:
        Partial state dict with tool_output populated.
    """
    tool_name = state.get("tool_name", "")
    tool_args = state.get("tool_args", {})
    session_id = state.get("session_id", "default")

    logger.info(f"[tool_node] Session '{session_id}': executing {tool_name}({tool_args})")

    try:
        result = await _dispatch_tool(tool_name, tool_args)
    except Exception as exc:
        logger.error(f"[tool_node] Error executing '{tool_name}': {exc}", exc_info=True)
        result = f"The {tool_name} tool encountered an error: {exc}"

    logger.info(f"[tool_node] Result: '{str(result)[:120]}'")
    return {"tool_output": str(result)}


async def _dispatch_tool(tool_name: str, args: dict) -> str:
    """Route a tool call by name to the appropriate backend function."""
    if tool_name == "get_weather":
        from backend.tools.weather import get_weather
        return await get_weather(args.get("city", ""))

    elif tool_name == "calculate":
        from backend.tools.calculator import calculate
        return calculate(args.get("expression", "0"))

    elif tool_name == "web_search":
        from backend.tools.web_search import web_search
        return await web_search(
            args.get("query", ""),
            max_results=args.get("max_results", 3),
        )

    elif tool_name == "news_search":
        from backend.tools.web_search import news_search
        return await news_search(
            args.get("topic", args.get("query", "")),
            max_results=args.get("max_results", 3),
        )

    elif tool_name == "save_note":
        from backend.tools.notion_notes import save_note
        return await save_note(
            title=args.get("title", "Voice Note"),
            content=args.get("content", ""),
        )

    elif tool_name == "search_notes":
        from backend.tools.notion_notes import search_notes
        return await search_notes(args.get("query", ""))

    elif tool_name == "list_notes":
        from backend.tools.notion_notes import list_recent_notes
        return await list_recent_notes(limit=args.get("limit", 5))

    else:
        return f"Unknown tool: {tool_name}"


async def format_tool_response(state: AgentState) -> dict[str, Any]:
    """
    Node: format_tool_response
    --------------------------
    Re-invoke the LLM with the tool output injected as context so it can
    produce a natural, voice-friendly final answer.

    Returns:
        Partial state dict with response and updated messages.
    """
    settings = get_settings()
    session_id = state.get("session_id", "default")
    tool_name = state.get("tool_name", "unknown")
    tool_output = state.get("tool_output", "")
    messages = list(state.get("messages", []))

    logger.info(
        f"[format_tool_response] Session '{session_id}': "
        f"formatting result for tool '{tool_name}'"
    )

    user_name = state.get("user_name", "User")
    system_prompt = VOICE_AGENT_SYSTEM_PROMPT + f"\n\nYou are speaking with {user_name}. (You don't need to use their name every time, just be aware of who they are)."

    # Build context: inject the tool result as an assistant turn
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if isinstance(msg, HumanMessage):
            api_messages.append({"role": "user", "content": str(msg.content)})
        elif isinstance(msg, AIMessage):
            api_messages.append({"role": "assistant", "content": str(msg.content)})

    # Append tool result as a system-level context injection
    api_messages.append({
        "role": "user",
        "content": (
            f"[Tool result from {tool_name}]: {tool_output}\n\n"
            "Please give me a concise, voice-friendly response based on this information. "
            "CRITICAL: Do NOT output any JSON, tool calls, or commands. Speak the final answer directly in plain English."
        ),
    })

    try:
        client = _get_cerebras_client()
        completion = await client.chat.completions.create(
            model=settings.cerebras_model,
            messages=api_messages,
            max_tokens=256,
            temperature=0.7,
        )
        response_text = completion.choices[0].message.content.strip()
        
        # Clean up any hallucinated JSON tool call prefixed to the response
        import re
        response_text = re.sub(r'^\{.*?\}\s*', '', response_text).strip()
        response_text = re.sub(r'^```json.*?```\s*', '', response_text, flags=re.DOTALL).strip()
        
        logger.info(f"[format_tool_response] Cleaned Response: '{response_text[:80]}'")

    except Exception as exc:
        logger.error(f"[format_tool_response] LLM error: {exc}", exc_info=True)
        # Fall back to returning tool output directly (still useful)
        response_text = tool_output

    return {
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }


async def _generate_session_title(user_id: str, session_id: str, query: str):
    """Background task to generate a concise 3-5 word title for the session."""
    try:
        from backend.config import get_settings
        import openai
        settings = get_settings()
        client = openai.AsyncOpenAI(
            api_key=settings.cerebras_api_key,
            base_url=settings.cerebras_base_url,
        )
        # Minimal prompt to save tokens (approx 25 tokens input, max 10 output)
        prompt = f"Summarize this into a 2-4 word title, no punctuation:\n{query}"
        
        completion = await client.chat.completions.create(
            model=settings.cerebras_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.3,
        )
        title_content = completion.choices[0].message.content
        title = title_content.strip().strip('"') if title_content else "Untitled Session"
        
        db = get_database()
        if db is not None:
            from bson.objectid import ObjectId
            # Update the conversation entry inside the user's document for this session
            await db.voice_agent_db.users.update_one(
                {"_id": ObjectId(user_id), "conversations.session_id": session_id},
                {"$set": {"conversations.$.session_name": title}}
            )
            logger.info(f"[_generate_session_title] Generated title for {session_id}: '{title}'")
    except Exception as e:
        logger.error(f"[_generate_session_title] Failed to generate title: {e}")

async def save_memory(state: AgentState) -> dict[str, Any]:
    """
    Node: save_memory
    -----------------
    Persist the latest human + assistant message exchange to short-term memory.
    Also log the exchange to the user's conversation history in MongoDB.
    """
    session_id = state.get("session_id", "default")
    user_id = state.get("user_id", "")
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

    if last_human and last_ai and user_id:
        from datetime import datetime
        now = datetime.utcnow()
        # Always use display_user_input (clean spoken text) for User_query so
        # the [System Note:...] barge-in decoration never leaks into history.
        display_query = state.get("display_user_input", "") or last_human
        conv_log = {
            "Date": now.strftime("%Y-%m-%d"),
            "Time": now.strftime("%H:%M:%S"),
            "User_query": display_query,
            "LLM_response": last_ai,
            "Tools_Used": state.get("tool_name") or None,
            "session_id": session_id,  # enables grouping conversations by session
        }
        db = get_database()
        if db is not None:
            from bson.objectid import ObjectId
            try:
                await db.voice_agent_db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$push": {"conversations": conv_log}}
                )
            except Exception as e:
                logger.error(f"[save_memory] Failed to log conversation: {e}")

    turn_count = memory.get_session_length(session_id)
    logger.debug(
        f"[save_memory] Session '{session_id}': saved turn "
        f"(total messages in memory: {turn_count})"
    )
    
    # Generate session title in the background on the 1st turn (2 messages) and 2nd turn (4 messages)
    if turn_count in [2, 4] and last_human and user_id:
        asyncio.create_task(_generate_session_title(user_id, session_id, state.get("display_user_input", "") or last_human))

    return {}
