"""
backend/agent/state.py
-----------------------
LangGraph agent state definition (updated Day 4 — tool routing added).
"""
from typing import Annotated, Optional, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    State passed through each node of the LangGraph StateGraph.

    Fields:
        messages:       Full conversation history (HumanMessage / AIMessage).
                        Uses add_messages reducer to append rather than replace.
        session_id:     Unique identifier for this conversation session.
        user_input:     The latest user utterance (injected before memory load).
        tool_name:      Name of the tool to call (set by llm_node, Day 4).
        tool_args:      Arguments for the tool call as a dict (Day 4).
        tool_output:    Output from the last MCP tool call (if any).
        response:       Final response text to be sent to TTS.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    session_id: str
    user_input: str
    tool_name: str          # "" means no tool call
    tool_args: dict         # arguments for the tool
    tool_output: str
    response: str
