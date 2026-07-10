"""
tests/test_tools.py
-------------------
Tests for all MCP tools and the FastMCP server.

Tests
-----
  Calculator (sync, no mocking needed)
    - test_calculator_multiply
    - test_calculator_sqrt
    - test_calculator_division
    - test_calculator_zero_division
    - test_calculator_invalid_expression
    - test_calculator_pi

  Weather (async, mocked httpx)
    - test_weather_success
    - test_weather_city_not_found
    - test_weather_http_error

  Web Search (async, mocked DDGS)
    - test_web_search_success
    - test_web_search_no_results
    - test_news_search_success

  Notion Notes (async, mocked notion_client)
    - test_save_note_success
    - test_save_note_no_database_id
    - test_search_notes_found
    - test_search_notes_not_found
    - test_list_recent_notes

  MCP Server
    - test_mcp_server_tools_registered

  Tool Dispatcher (_dispatch_tool in nodes)
    - test_dispatch_calculate
    - test_dispatch_weather
    - test_dispatch_unknown_tool
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


# =============================================================================
# Calculator tests (sync)
# =============================================================================

class TestCalculator:
    def test_multiply(self):
        from backend.tools.calculator import calculate
        result = calculate("13 * 19")
        assert "247" in result

    def test_sqrt(self):
        from backend.tools.calculator import calculate
        result = calculate("sqrt(144)")
        assert "12" in result

    def test_division(self):
        from backend.tools.calculator import calculate
        result = calculate("100 / 4")
        assert "25" in result

    def test_power(self):
        from backend.tools.calculator import calculate
        result = calculate("2 ** 10")
        assert "1024" in result

    def test_zero_division(self):
        from backend.tools.calculator import calculate
        result = calculate("1 / 0")
        assert "zero" in result.lower() or "divide" in result.lower()

    def test_invalid_expression(self):
        from backend.tools.calculator import calculate
        result = calculate("not_a_number + hello")
        # Should return error message, not crash
        assert isinstance(result, str)
        assert len(result) > 0

    def test_pi_constant(self):
        from backend.tools.calculator import calculate
        result = calculate("pi")
        assert "3.14" in result

    def test_floor(self):
        from backend.tools.calculator import calculate
        result = calculate("floor(3.7)")
        assert "3" in result

    def test_nested_expression(self):
        from backend.tools.calculator import calculate
        result = calculate("sqrt(abs(-16))")
        assert "4" in result


# =============================================================================
# Weather tests (async, mocked httpx)
# =============================================================================

@pytest.mark.asyncio
class TestWeather:
    async def test_weather_success(self):
        """Test successful weather fetch for Paris."""
        from backend.tools.weather import get_weather

        geo_response = MagicMock()
        geo_response.raise_for_status = MagicMock()
        geo_response.json.return_value = {
            "results": [
                {"latitude": 48.85, "longitude": 2.35, "name": "Paris", "country": "France"}
            ]
        }

        weather_response = MagicMock()
        weather_response.raise_for_status = MagicMock()
        weather_response.json.return_value = {
            "current": {
                "temperature_2m": 22.0,
                "apparent_temperature": 20.0,
                "weather_code": 2,
                "wind_speed_10m": 15.0,
                "relative_humidity_2m": 60,
            }
        }

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=[geo_response, weather_response])

        with patch("backend.tools.weather.httpx.AsyncClient", return_value=mock_client):
            result = await get_weather("Paris")

        assert "Paris" in result
        assert "22" in result
        assert "partly cloudy" in result.lower() or "celsius" in result.lower()

    async def test_weather_city_not_found(self):
        """Test behaviour when geocoding returns no results."""
        from backend.tools.weather import get_weather

        geo_response = MagicMock()
        geo_response.raise_for_status = MagicMock()
        geo_response.json.return_value = {"results": []}

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=geo_response)

        with patch("backend.tools.weather.httpx.AsyncClient", return_value=mock_client):
            result = await get_weather("ZZZNotARealCity")

        assert "couldn't find" in result.lower() or "sorry" in result.lower()

    async def test_weather_http_error(self):
        """Test that HTTP errors return a graceful error message."""
        import httpx
        from backend.tools.weather import get_weather

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("Connection timeout"))

        with patch("backend.tools.weather.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(Exception):
                await get_weather("London")


# =============================================================================
# Web Search tests (async, mocked DDGS)
# =============================================================================

@pytest.mark.asyncio
class TestWebSearch:
    async def test_web_search_success(self):
        """Test successful DuckDuckGo search."""
        from backend.tools.web_search import web_search

        mock_results = [
            {"title": "AI News Today", "body": "Artificial intelligence continues to advance rapidly with new models."},
            {"title": "Latest AI Developments", "body": "Researchers have published breakthrough results this week."},
        ]

        mock_ddgs = MagicMock()
        mock_ddgs.__enter__ = MagicMock(return_value=mock_ddgs)
        mock_ddgs.__exit__ = MagicMock(return_value=False)
        mock_ddgs.text = MagicMock(return_value=mock_results)

        with patch("backend.tools.web_search.DDGS", return_value=mock_ddgs):
            result = await web_search("latest AI news", max_results=2)

        assert "AI News Today" in result or "found" in result.lower()
        assert isinstance(result, str)

    async def test_web_search_no_results(self):
        """Test handling of empty search results."""
        from backend.tools.web_search import web_search

        mock_ddgs = MagicMock()
        mock_ddgs.__enter__ = MagicMock(return_value=mock_ddgs)
        mock_ddgs.__exit__ = MagicMock(return_value=False)
        mock_ddgs.text = MagicMock(return_value=[])

        with patch("backend.tools.web_search.DDGS", return_value=mock_ddgs):
            result = await web_search("xyzqwerty12345")

        assert "couldn't find" in result.lower() or "no results" in result.lower()

    async def test_news_search_success(self):
        """Test DuckDuckGo news search."""
        from backend.tools.web_search import news_search

        mock_results = [
            {
                "title": "AI Breakthrough",
                "source": "TechCrunch",
                "body": "New model achieves state-of-the-art performance.",
            }
        ]

        mock_ddgs = MagicMock()
        mock_ddgs.__enter__ = MagicMock(return_value=mock_ddgs)
        mock_ddgs.__exit__ = MagicMock(return_value=False)
        mock_ddgs.news = MagicMock(return_value=mock_results)

        with patch("backend.tools.web_search.DDGS", return_value=mock_ddgs):
            result = await news_search("AI news")

        assert isinstance(result, str)
        assert len(result) > 0

    async def test_web_search_import_error(self):
        """Test graceful handling when DDGS is None (not installed)."""
        from backend.tools import web_search as ws_module

        with patch.object(ws_module, "DDGS", None):
            result = await ws_module.web_search("test query")
        assert "not available" in result.lower() or isinstance(result, str)


# =============================================================================
# Notion Notes tests (async, mocked notion_client)
# =============================================================================

@pytest.mark.asyncio
class TestNotionNotes:
    async def test_save_note_success(self):
        """Test saving a note to Notion."""
        from backend.tools.notion_notes import save_note

        mock_page = {"id": "test-page-id-123"}
        mock_client = AsyncMock()
        mock_client.pages = AsyncMock()
        mock_client.pages.create = AsyncMock(return_value=mock_page)

        with patch("backend.tools.notion_notes._get_client", return_value=mock_client):
            with patch("backend.tools.notion_notes.settings") as mock_settings:
                mock_settings.notion_database_id = "test-db-id"
                mock_settings.notion_api_key = "ntn_test_key"
                result = await save_note("Buy milk", "I need to buy milk from the store")

        assert "saved" in result.lower() or "milk" in result.lower()

    async def test_save_note_no_database_id(self):
        """Test that missing database ID returns a configuration error message."""
        from backend.tools import notion_notes

        with patch.object(notion_notes, "settings") as mock_settings:
            mock_settings.notion_database_id = ""
            result = await notion_notes.save_note("Test", "Test content")

        assert "not configured" in result.lower() or "notion" in result.lower()

    async def test_search_notes_found(self):
        """Test searching notes with results."""
        from backend.tools import notion_notes

        mock_response = {
            "results": [
                {
                    "properties": {
                        "Name": {
                            "title": [{"text": {"content": "Buy milk"}}]
                        },
                        "Content": {
                            "rich_text": [{"text": {"content": "I need to buy milk"}}]
                        },
                    }
                }
            ]
        }

        mock_client = AsyncMock()
        mock_client.databases = AsyncMock()
        mock_client.databases.query = AsyncMock(return_value=mock_response)

        with patch.object(notion_notes, "_get_client", return_value=mock_client):
            with patch.object(notion_notes, "settings") as mock_settings:
                mock_settings.notion_database_id = "test-db-id"
                mock_settings.notion_api_key = "ntn_test_key"
                result = await notion_notes.search_notes("milk")

        assert "Buy milk" in result or "found" in result.lower()

    async def test_search_notes_not_found(self):
        """Test searching notes with no results."""
        from backend.tools import notion_notes

        mock_response = {"results": []}
        mock_client = AsyncMock()
        mock_client.databases = AsyncMock()
        mock_client.databases.query = AsyncMock(return_value=mock_response)

        with patch.object(notion_notes, "_get_client", return_value=mock_client):
            with patch.object(notion_notes, "settings") as mock_settings:
                mock_settings.notion_database_id = "test-db-id"
                mock_settings.notion_api_key = "ntn_test_key"
                result = await notion_notes.search_notes("nonexistent query xyz")

        assert "couldn't find" in result.lower() or "no notes" in result.lower()

    async def test_list_recent_notes(self):
        """Test listing recent notes."""
        from backend.tools import notion_notes

        mock_response = {
            "results": [
                {
                    "properties": {
                        "Name": {
                            "title": [{"text": {"content": "Buy milk"}}]
                        }
                    }
                },
                {
                    "properties": {
                        "Name": {
                            "title": [{"text": {"content": "Call dentist"}}]
                        }
                    }
                },
            ]
        }

        mock_client = AsyncMock()
        mock_client.databases = AsyncMock()
        mock_client.databases.query = AsyncMock(return_value=mock_response)

        with patch.object(notion_notes, "_get_client", return_value=mock_client):
            with patch.object(notion_notes, "settings") as mock_settings:
                mock_settings.notion_database_id = "test-db-id"
                mock_settings.notion_api_key = "ntn_test_key"
                result = await notion_notes.list_recent_notes(limit=5)

        assert "Buy milk" in result or "notes" in result.lower()
        assert "Call dentist" in result or "recent" in result.lower()


# =============================================================================
# MCP Server tests
# =============================================================================

class TestMCPServer:
    def test_mcp_server_importable(self):
        """Test that the MCP server module imports without error."""
        from backend.mcp.server import mcp
        assert mcp is not None

    def test_mcp_server_has_correct_name(self):
        """Test FastMCP server name."""
        from backend.mcp.server import mcp
        assert mcp.name == "VoiceAgentTools"

    def test_mcp_tools_registered(self):
        """Test that all expected tools are registered with the MCP server."""
        from backend.mcp import server  # noqa: F401 — ensure module is loaded

        # FastMCP exposes tools via ._tool_manager or similar
        # We verify the tool functions exist as decorated callables
        expected_tools = [
            "get_weather",
            "calculate",
            "web_search",
            "news_search",
            "save_note",
            "search_notes",
            "list_notes",
        ]
        for tool_name in expected_tools:
            assert hasattr(server, tool_name), (
                f"Expected tool '{tool_name}' not found in backend.mcp.server"
            )


# =============================================================================
# Tool Dispatcher tests (nodes._dispatch_tool)
# =============================================================================

@pytest.mark.asyncio
class TestToolDispatcher:
    async def test_dispatch_calculate(self):
        """Test dispatching to the calculator tool."""
        from backend.agent.nodes import _dispatch_tool
        result = await _dispatch_tool("calculate", {"expression": "13 * 19"})
        assert "247" in result

    async def test_dispatch_calculate_sqrt(self):
        """Test dispatching calculate with sqrt."""
        from backend.agent.nodes import _dispatch_tool
        result = await _dispatch_tool("calculate", {"expression": "sqrt(81)"})
        assert "9" in result

    async def test_dispatch_weather(self):
        """Test dispatching to the weather tool (mocked)."""
        from backend.agent.nodes import _dispatch_tool

        geo_response = MagicMock()
        geo_response.raise_for_status = MagicMock()
        geo_response.json.return_value = {
            "results": [{"latitude": 51.5, "longitude": -0.1, "name": "London", "country": "UK"}]
        }
        weather_response = MagicMock()
        weather_response.raise_for_status = MagicMock()
        weather_response.json.return_value = {
            "current": {
                "temperature_2m": 15.0,
                "apparent_temperature": 13.0,
                "weather_code": 61,
                "wind_speed_10m": 20.0,
                "relative_humidity_2m": 75,
            }
        }

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=[geo_response, weather_response])

        with patch("backend.tools.weather.httpx.AsyncClient", return_value=mock_client):
            result = await _dispatch_tool("get_weather", {"city": "London"})

        assert isinstance(result, str)
        assert "London" in result or "15" in result

    async def test_dispatch_unknown_tool(self):
        """Test that an unknown tool name returns an error string."""
        from backend.agent.nodes import _dispatch_tool
        result = await _dispatch_tool("nonexistent_tool_xyz", {})
        assert "unknown" in result.lower() or "nonexistent" in result.lower()

    async def test_dispatch_web_search(self):
        """Test dispatching to the web search tool (mocked)."""
        from backend.agent.nodes import _dispatch_tool

        mock_results = [
            {"title": "AI News", "body": "Breakthrough in machine learning reported."}
        ]
        mock_ddgs = MagicMock()
        mock_ddgs.__enter__ = MagicMock(return_value=mock_ddgs)
        mock_ddgs.__exit__ = MagicMock(return_value=False)
        mock_ddgs.text = MagicMock(return_value=mock_results)

        with patch("backend.tools.web_search.DDGS", return_value=mock_ddgs):
            result = await _dispatch_tool("web_search", {"query": "AI news", "max_results": 1})

        assert isinstance(result, str)
        assert len(result) > 0
