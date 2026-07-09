"""
backend/mcp/server.py
----------------------
FastMCP server that exposes all four Voice AI Agent tools as MCP-compatible
endpoints:

    - get_weather   (Open-Meteo, no API key)
    - calculate     (AST-safe math evaluator)
    - web_search    (DuckDuckGo, no API key)
    - save_note     (Notion API)
    - search_notes  (Notion API)
    - list_notes    (Notion API)

Run standalone for testing:
    python -m backend.mcp.server

Or import for embedding:
    from backend.mcp.server import mcp
"""
import logging

from fastmcp import FastMCP

logger = logging.getLogger(__name__)

# ── Instantiate FastMCP app ───────────────────────────────────────────────────
mcp = FastMCP(name="VoiceAgentTools")


# ── Weather ───────────────────────────────────────────────────────────────────
@mcp.tool()
async def get_weather(city: str) -> str:
    """
    Get the current weather for a city.

    Args:
        city: City name (e.g. "Paris", "London", "New York").

    Returns:
        Human-readable weather string suitable for text-to-speech.
    """
    from backend.tools.weather import get_weather as _get_weather
    logger.info(f"[MCP] get_weather called: city={city!r}")
    return await _get_weather(city)


# ── Calculator ────────────────────────────────────────────────────────────────
@mcp.tool()
def calculate(expression: str) -> str:
    """
    Evaluate a mathematical expression safely.

    Supports: +, -, *, /, //, %, **, sqrt, abs, round, floor, ceil,
              sin, cos, tan, log, log10, exp, pi, e

    Args:
        expression: Math expression string (e.g. "13 * 19", "sqrt(144)").

    Returns:
        Human-readable result string suitable for text-to-speech.
    """
    from backend.tools.calculator import calculate as _calculate
    logger.info(f"[MCP] calculate called: expression={expression!r}")
    return _calculate(expression)


# ── Web Search ────────────────────────────────────────────────────────────────
@mcp.tool()
async def web_search(query: str, max_results: int = 3) -> str:
    """
    Search the web using DuckDuckGo.

    Args:
        query: Search query string.
        max_results: Number of top results to summarise (default: 3).

    Returns:
        Voice-friendly summary of the top search results.
    """
    from backend.tools.web_search import web_search as _web_search
    logger.info(f"[MCP] web_search called: query={query!r}")
    return await _web_search(query, max_results=max_results)


@mcp.tool()
async def news_search(topic: str, max_results: int = 3) -> str:
    """
    Search for recent news on a topic using DuckDuckGo News.

    Args:
        topic: News topic (e.g. "latest AI breakthroughs").
        max_results: Number of news items to summarise.

    Returns:
        Voice-friendly news summary.
    """
    from backend.tools.web_search import news_search as _news_search
    logger.info(f"[MCP] news_search called: topic={topic!r}")
    return await _news_search(topic, max_results=max_results)


# ── Notion Notes ──────────────────────────────────────────────────────────────
@mcp.tool()
async def save_note(title: str, content: str) -> str:
    """
    Save a personal note to Notion.

    Args:
        title: Short title or summary of the note.
        content: Full note content.

    Returns:
        Confirmation message.
    """
    from backend.tools.notion_notes import save_note as _save_note
    logger.info(f"[MCP] save_note called: title={title!r}")
    return await _save_note(title=title, content=content)


@mcp.tool()
async def search_notes(query: str, max_results: int = 5) -> str:
    """
    Search personal notes in Notion.

    Args:
        query: Search query string.
        max_results: Maximum number of results to return.

    Returns:
        Voice-friendly summary of matching notes.
    """
    from backend.tools.notion_notes import search_notes as _search_notes
    logger.info(f"[MCP] search_notes called: query={query!r}")
    return await _search_notes(query, max_results=max_results)


@mcp.tool()
async def list_notes(limit: int = 5) -> str:
    """
    List the most recently created notes from Notion.

    Args:
        limit: Maximum number of notes to list.

    Returns:
        Voice-friendly list of recent note titles.
    """
    from backend.tools.notion_notes import list_recent_notes as _list_recent_notes
    logger.info(f"[MCP] list_notes called: limit={limit}")
    return await _list_recent_notes(limit=limit)


# ── Standalone entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    import logging

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("[MCP] Starting FastMCP server on stdio transport...")
    mcp.run()
