"""
backend/agent/graph.py
-----------------------
LangGraph StateGraph wiring for the voice AI agent.

Graph topology (linear, Day 3 — no tool routing yet):

    START → load_memory → llm_node → save_memory → END

Day 4 will extend this with a conditional tool-routing edge:
    llm_node → (has_tool_call?) → tool_node → save_memory → END
                                 ↘ save_memory → END  (no tool call)

Usage
-----
    from backend.agent.graph import get_agent_graph

    graph = get_agent_graph()
    result = await graph.ainvoke({
        "session_id": "room-abc",
        "messages": [HumanMessage(content="Hello!")],
        "tool_output": "",
        "response": "",
    })
    print(result["response"])
"""
import logging

from langgraph.graph import END, START, StateGraph

from backend.agent.nodes import llm_node, load_memory, save_memory
from backend.agent.state import AgentState

logger = logging.getLogger(__name__)

# Module-level compiled graph (singleton — compiled once, reused per call)
_compiled_graph = None


def build_agent_graph() -> StateGraph:
    """
    Construct and compile the LangGraph StateGraph.

    Graph nodes
    -----------
    load_memory  — pull session history into state["messages"]
    llm_node     — call Cerebras LLM, set state["response"]
    save_memory  — write new messages back to short-term memory store

    Edges
    -----
    START → load_memory → llm_node → save_memory → END

    Returns:
        Compiled LangGraph graph (runnable via .ainvoke() or .invoke()).
    """
    graph_builder = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────────
    graph_builder.add_node("load_memory", load_memory)
    graph_builder.add_node("llm_node", llm_node)
    graph_builder.add_node("save_memory", save_memory)

    # ── Wire edges ────────────────────────────────────────────────────────────
    graph_builder.add_edge(START, "load_memory")
    graph_builder.add_edge("load_memory", "llm_node")
    graph_builder.add_edge("llm_node", "save_memory")
    graph_builder.add_edge("save_memory", END)

    compiled = graph_builder.compile()
    logger.info(
        "[AgentGraph] StateGraph compiled: "
        "START → load_memory → llm_node → save_memory → END"
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
    from langchain_core.messages import HumanMessage

    graph = get_agent_graph()

    initial_state: AgentState = {
        "messages": [],
        "session_id": session_id,
        "user_input": user_text,
        "tool_output": "",
        "response": "",
    }

    logger.info(
        f"[run_agent_turn] Session '{session_id}': "
        f"user='{user_text[:60]}...'"
    )

    result = await graph.ainvoke(initial_state)
    response = result.get("response", "")

    logger.info(
        f"[run_agent_turn] Session '{session_id}': "
        f"response='{response[:80]}...'"
    )
    return response
