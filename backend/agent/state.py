"""
backend/agent/state.py
-----------------------
LangGraph agent state definition (stub — populated on Day 3).
"""
from typing import Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    State passed through each node of the LangGraph StateGraph.

    Fields:
        messages:     Full conversation history (HumanMessage / AIMessage).
                      Uses add_messages reducer to append rather than replace.
        session_id:   Unique identifier for this conversation session.
        user_input:   The latest user utterance (injected before memory load).
        tool_output:  Output from the last MCP tool call (if any).
        response:     Final response text to be sent to TTS.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    session_id: str
    user_input: str
    tool_output: str
    response: str
