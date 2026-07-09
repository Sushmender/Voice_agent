"""
backend/agent/graph.py
-----------------------
LangGraph StateGraph wiring for the voice AI agent.

Graph topology (Day 4 — with tool routing):

    START → load_memory → llm_node ─┬─(tool call)──→ tool_node → format_tool_response → save_memory → END
                                     └─(no tool)────────────────────────────────────────→ save_memory → END

Usage
-----
    from backend.agent.graph import get_agent_graph

    graph = get_agent_graph()
    result = await graph.ainvoke({
        "session_id": "room-abc",
        "messages": [],
        "user_input": "What's the weather in Paris?",
        "tool_name": "",
        "tool_args": {},
        "tool_output": "",
        "response": "",
    })
    print(result["response"])
"""
import logging

from langgraph.graph import END, START, StateGraph

from backend.agent.nodes import (
    format_tool_response,
    llm_node,
    load_memory,
    save_memory,
    tool_node,
)
from backend.agent.state import AgentState

logger = logging.getLogger(__name__)

# Module-level compiled graph (singleton — compiled once, reused per call)
_compiled_graph = None


def _route_after_llm(state: AgentState) -> str:
    """
    Conditional edge function called after llm_node.

    Returns:
        "tool_node"    — if the LLM requested a tool call.
        "save_memory"  — if the LLM gave a direct answer.
    """
    tool_name = state.get("tool_name", "")
    if tool_name:
        logger.debug(f"[Router] Routing to tool_node (tool='{tool_name}')")
        return "tool_node"
    logger.debug("[Router] Routing directly to save_memory (no tool call)")
    return "save_memory"


def build_agent_graph() -> StateGraph:
    """
    Construct and compile the LangGraph StateGraph.

    Graph nodes
    -----------
    load_memory           — pull session history into state["messages"]
    llm_node              — call Cerebras LLM; detect tool intent
    tool_node             — execute tool (if requested)
    format_tool_response  — re-invoke LLM with tool output for final answer
    save_memory           — write new messages back to short-term memory store

    Edges
    -----
    START → load_memory → llm_node ─┬─(tool_call)──→ tool_node → format_tool_response → save_memory → END
                                     └─(no tool)────────────────────────────────────────→ save_memory → END

    Returns:
        Compiled LangGraph graph (runnable via .ainvoke() or .invoke()).
    """
    graph_builder = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────────
    graph_builder.add_node("load_memory", load_memory)
    graph_builder.add_node("llm_node", llm_node)
    graph_builder.add_node("tool_node", tool_node)
    graph_builder.add_node("format_tool_response", format_tool_response)
    graph_builder.add_node("save_memory", save_memory)

    # ── Wire edges ────────────────────────────────────────────────────────────
    graph_builder.add_edge(START, "load_memory")
    graph_builder.add_edge("load_memory", "llm_node")

    # Conditional routing after LLM decides
    graph_builder.add_conditional_edges(
        "llm_node",
        _route_after_llm,
        {
            "tool_node": "tool_node",
            "save_memory": "save_memory",
        },
    )

    # Tool execution → LLM formatting → memory
    graph_builder.add_edge("tool_node", "format_tool_response")
    graph_builder.add_edge("format_tool_response", "save_memory")
    graph_builder.add_edge("save_memory", END)

    compiled = graph_builder.compile()
    logger.info(
        "[AgentGraph] StateGraph compiled: "
        "START → load_memory → llm_node → (tool_node → format_tool_response →)? save_memory → END"
    )
    return compiled


def get_agent_graph():
    """
    Return the compiled agent graph (singleton).

    The graph is compiled once at first call and cached for reuse.
    This avoids recompiling on every voice turn, which saves ~5 ms.
    """
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_agent_graph()
    return _compiled_graph


async def run_agent_turn(session_id: str, user_text: str) -> str:
    """
    Convenience wrapper: run one turn of the agent graph.

    Packages the user utterance as a HumanMessage, invokes the full graph,
    and returns the plain-text response string for TTS.

    Args:
        session_id: Unique session identifier (e.g., LiveKit room name).
        user_text:  Transcribed user speech from Groq Whisper.

    Returns:
        Response text from the LLM (ready to be synthesised by Cartesia TTS).
    """
    graph = get_agent_graph()

    initial_state: AgentState = {
        "messages": [],
        "session_id": session_id,
        "user_input": user_text,
        "tool_name": "",
        "tool_args": {},
        "tool_output": "",
        "response": "",
    }

    logger.info(
        f"[run_agent_turn] Session '{session_id}': "
        f"user='{user_text[:60]}'"
    )

    result = await graph.ainvoke(initial_state)
    response = result.get("response", "")

    logger.info(
        f"[run_agent_turn] Session '{session_id}': "
        f"response='{response[:80]}'"
    )
    return response
