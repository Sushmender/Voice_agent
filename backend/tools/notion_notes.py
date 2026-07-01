"""
backend/tools/notion_notes.py
------------------------------
Notion notes tool: save and retrieve personal notes via the Notion API.

Requires:
    - NOTION_API_KEY: Integration token from https://www.notion.so/my-integrations
    - NOTION_DATABASE_ID: ID of a Notion database shared with the integration

Notion database schema (create this in Notion before using):
    - Title (Title type)   : Note title / summary
    - Content (Text type)  : Full note content
    - Tags (Multi-select)  : Optional tags
    - Created (Date type)  : Auto-set creation date

Example usage:
    result = await save_note("Buy groceries", "Milk, eggs, bread, butter")
    result = await search_notes("groceries")
"""
import logging
from datetime import datetime
from typing import Optional

from backend.config import settings

logger = logging.getLogger(__name__)


def _get_client():
    """Return authenticated Notion client."""
    if not settings.notion_api_key:
        raise ValueError(
            "NOTION_API_KEY not configured. "
            "Get a free integration token at https://www.notion.so/my-integrations"
        )
    from notion_client import AsyncClient
    return AsyncClient(auth=settings.notion_api_key)


async def save_note(title: str, content: str, tags: Optional[list] = None) -> str:
    """
    Save a note to the Notion database.

    Args:
        title: Short title or summary of the note.
        content: Full note content.
        tags: Optional list of tag strings.

    Returns:
        Confirmation message suitable for TTS.
    """
    if not settings.notion_database_id:
        return "Notion is not configured. Please set NOTION_DATABASE_ID in your .env file."

    logger.info(f"[Notion] Saving note: '{title}'")

    try:
        client = _get_client()

        # Build page properties matching the database schema
        properties = {
            "Name": {
                "title": [{"text": {"content": title}}]
            },
            "Content": {
                "rich_text": [{"text": {"content": content[:2000]}}]  # Notion limit
            },
        }

        if tags:
            properties["Tags"] = {
                "multi_select": [{"name": tag} for tag in tags[:5]]
            }

        # Create the page in the database
        page = await client.pages.create(
            parent={"database_id": settings.notion_database_id},
            properties=properties,
        )

        page_id = page["id"]
        logger.info(f"[Notion] Note saved with ID: {page_id}")
        return f"I've saved your note '{title}' to Notion successfully."

    except ValueError as e:
        return str(e)
    except Exception as e:
        logger.error(f"[Notion] Error saving note: {e}")
        return f"I couldn't save the note to Notion. Please check your Notion configuration."


async def search_notes(query: str, max_results: int = 5) -> str:
    """
    Search notes in the Notion database.

    Args:
        query: Search query string.
        max_results: Maximum number of results to return.

    Returns:
        Voice-friendly summary of matching notes.
    """
    if not settings.notion_database_id:
        return "Notion is not configured. Please set NOTION_DATABASE_ID in your .env file."

    logger.info(f"[Notion] Searching notes for: '{query}'")

    try:
        client = _get_client()

        # Query the database
        response = await client.databases.query(
            database_id=settings.notion_database_id,
            filter={
                "or": [
                    {
                        "property": "Name",
                        "title": {"contains": query}
                    },
                    {
                        "property": "Content",
                        "rich_text": {"contains": query}
                    }
                ]
            },
            page_size=max_results,
            sorts=[{
                "timestamp": "created_time",
                "direction": "descending"
            }],
        )

        pages = response.get("results", [])

        if not pages:
            return f"I couldn't find any notes matching '{query}'."

        notes = []
        for page in pages:
            # Extract title
            title_prop = page["properties"].get("Name", {})
            title_parts = title_prop.get("title", [])
            title = title_parts[0]["text"]["content"] if title_parts else "Untitled"

            # Extract content snippet
            content_prop = page["properties"].get("Content", {})
            content_parts = content_prop.get("rich_text", [])
            content = content_parts[0]["text"]["content"] if content_parts else ""
            if len(content) > 100:
                content = content[:97] + "..."

            notes.append(f"'{title}': {content}" if content else f"'{title}'")

        if len(notes) == 1:
            return f"I found one note: {notes[0]}"
        else:
            combined = ". ".join(notes)
            return f"I found {len(notes)} notes: {combined}"

    except ValueError as e:
        return str(e)
    except Exception as e:
        logger.error(f"[Notion] Error searching notes: {e}")
        return "I couldn't search your Notion notes right now."


async def list_recent_notes(limit: int = 5) -> str:
    """
    List the most recently created notes.

    Args:
        limit: Maximum number of notes to list.

    Returns:
        Voice-friendly list of recent notes.
    """
    if not settings.notion_database_id:
        return "Notion is not configured."

    try:
        client = _get_client()

        response = await client.databases.query(
            database_id=settings.notion_database_id,
            page_size=limit,
            sorts=[{
                "timestamp": "created_time",
                "direction": "descending"
            }],
        )

        pages = response.get("results", [])

        if not pages:
            return "You don't have any saved notes yet."

        titles = []
        for page in pages:
            title_prop = page["properties"].get("Name", {})
            title_parts = title_prop.get("title", [])
            title = title_parts[0]["text"]["content"] if title_parts else "Untitled"
            titles.append(f"'{title}'")

        if len(titles) == 1:
            return f"You have one recent note: {titles[0]}."
        else:
            joined = ", ".join(titles[:-1]) + f", and {titles[-1]}"
            return f"Your {len(titles)} most recent notes are: {joined}."

    except Exception as e:
        logger.error(f"[Notion] Error listing notes: {e}")
        return "I couldn't retrieve your notes right now."
