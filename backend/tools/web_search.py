"""
backend/tools/web_search.py
-----------------------------
Web search tool using DuckDuckGo (completely free, no API key required).

Uses the `duckduckgo-search` library to fetch top search results
and return a concise, voice-friendly summary.

Example usage:
    from backend.tools.web_search import web_search
    result = await web_search("latest AI news")
"""
import asyncio
import logging
from typing import Optional

try:
    from ddgs import DDGS
except ImportError:
    DDGS = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


async def web_search(query: str, max_results: int = 3) -> str:
    """
    Search the web using DuckDuckGo and return a voice-friendly summary.

    Args:
        query: Search query string.
        max_results: Number of top results to summarize (default: 3).

    Returns:
        Human-readable summary of search results, suitable for TTS.
    """
    logger.info(f"[WebSearch] Query: '{query}'")

    if DDGS is None:
        return "The web search tool is not available. Please install duckduckgo-search."

    # ── Temporal enrichment ───────────────────────────────────────────────────
    import re
    from datetime import datetime
    current_year = str(datetime.now().year)
    _year_re = re.compile(r'\b(20\d{2})\b')
    _time_keywords_re = re.compile(
        r'\b(latest|recent|newest|current|who won|champion|winner|standings|ranking)\b',
        re.IGNORECASE,
    )
    existing_year = _year_re.search(query)
    if existing_year:
        if existing_year.group(1) != current_year and _time_keywords_re.search(query):
            # LLM embedded a stale training-data year in a "latest" query — replace it
            query = _year_re.sub(current_year, query)
            logger.info(f"[WebSearch] Stale-year replaced query: '{query}'")
    else:
        # No year at all — append current year so DuckDuckGo surfaces fresh results
        query = f"{query} {current_year}"
        logger.info(f"[WebSearch] Year-enriched query: '{query}'")

    try:
        # Run synchronous DDGS in a thread to avoid blocking the event loop
        def _search():
            with DDGS() as ddgs:
                results = list(ddgs.text(
                    query,
                    max_results=max_results,
                    safesearch="moderate",
                ))
            return results

        results = await asyncio.to_thread(_search)

        if not results:
            return f"I couldn't find any results for '{query}'. Try a different search term."

        # Build a voice-friendly summary
        summaries = []
        for i, r in enumerate(results, 1):
            title = r.get("title", "Unknown source")
            body = r.get("body", "").strip()
            # Truncate body for voice (keep it brief)
            if len(body) > 150:
                body = body[:147] + "..."
            summaries.append(f"Result {i}: {title}. {body}")

        combined = " | ".join(summaries)
        response = f"Here's what I found for '{query}': {combined}"

        logger.info(f"[WebSearch] Found {len(results)} results")
        return response

    except Exception as e:
        logger.error(f"[WebSearch] Error: {e}")
        return f"I ran into an issue searching for '{query}'. Please try again."


async def news_search(topic: str, max_results: int = 3) -> str:
    """
    Search for recent news on a topic using DuckDuckGo News.

    Args:
        topic: News topic to search for.
        max_results: Number of news items to summarize.

    Returns:
        Voice-friendly news summary.
    """
    logger.info(f"[NewsSearch] Topic: '{topic}'")

    if DDGS is None:
        return "The web search tool is not available. Please install duckduckgo-search."

    # ── Temporal enrichment ───────────────────────────────────────────────────
    import re
    from datetime import datetime
    current_year = str(datetime.now().year)
    _year_re = re.compile(r'\b(20\d{2})\b')
    _time_keywords_re = re.compile(
        r'\b(latest|recent|newest|current|who won|champion|winner|standings|ranking)\b',
        re.IGNORECASE,
    )
    existing_year = _year_re.search(topic)
    if existing_year:
        if existing_year.group(1) != current_year and _time_keywords_re.search(topic):
            topic = _year_re.sub(current_year, topic)
            logger.info(f"[NewsSearch] Stale-year replaced topic: '{topic}'")
    else:
        topic = f"{topic} {current_year}"
        logger.info(f"[NewsSearch] Year-enriched topic: '{topic}'")

    try:
        def _search():
            with DDGS() as ddgs:
                results = list(ddgs.news(
                    topic,
                    max_results=max_results,
                ))
            return results

        results = await asyncio.to_thread(_search)

        if not results:
            return f"I couldn't find recent news about '{topic}'."

        summaries = []
        for r in results:
            title = r.get("title", "Unknown")
            source = r.get("source", "Unknown source")
            body = r.get("body", "").strip()
            if len(body) > 120:
                body = body[:117] + "..."
            summaries.append(f"From {source}: {title}. {body}")

        combined = ". ".join(summaries)
        response = f"Here are the latest news on '{topic}': {combined}"
        return response

    except Exception as e:
        logger.error(f"[NewsSearch] Error: {e}")
        return f"I couldn't fetch news about '{topic}' right now."
