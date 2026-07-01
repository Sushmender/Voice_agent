"""
backend/tools/weather.py
-------------------------
Weather tool using Open-Meteo API (completely free, no API key required).

Uses Open-Meteo + Open-Meteo Geocoding API to:
1. Convert city name → (lat, lon)
2. Fetch current weather at those coordinates

Fully implemented on Day 4. This stub can be imported on Day 1.

Example usage:
    from backend.tools.weather import get_weather
    result = await get_weather("Paris")
    # Returns: "Current weather in Paris: 22°C, partly cloudy, wind 15 km/h"
"""
import httpx
import logging

logger = logging.getLogger(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather code descriptions
WMO_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "foggy", 48: "icy fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    61: "light rain", 63: "moderate rain", 65: "heavy rain",
    71: "light snow", 73: "moderate snow", 75: "heavy snow",
    80: "light showers", 81: "moderate showers", 82: "heavy showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "heavy thunderstorm",
}


async def get_weather(city: str) -> str:
    """
    Get current weather for a city using Open-Meteo (no API key needed).

    Args:
        city: City name (e.g., "Paris", "London", "New York").

    Returns:
        Human-readable weather string suitable for TTS.
        e.g., "In Paris right now: 22 degrees Celsius, partly cloudy, wind 15 km/h."
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Geocode city name to coordinates
        geo_resp = await client.get(
            GEOCODING_URL,
            params={"name": city, "count": 1, "language": "en", "format": "json"},
        )
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()

        if not geo_data.get("results"):
            return f"Sorry, I couldn't find the city '{city}'. Please try a different city name."

        location = geo_data["results"][0]
        lat = location["latitude"]
        lon = location["longitude"]
        display_name = location.get("name", city)
        country = location.get("country", "")

        # Step 2: Fetch current weather
        weather_resp = await client.get(
            WEATHER_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": [
                    "temperature_2m",
                    "apparent_temperature",
                    "weather_code",
                    "wind_speed_10m",
                    "relative_humidity_2m",
                ],
                "temperature_unit": "celsius",
                "wind_speed_unit": "kmh",
                "timezone": "auto",
            },
        )
        weather_resp.raise_for_status()
        weather_data = weather_resp.json()

        current = weather_data["current"]
        temp = round(current["temperature_2m"])
        feels_like = round(current["apparent_temperature"])
        humidity = current["relative_humidity_2m"]
        wind = round(current["wind_speed_10m"])
        condition = WMO_CODES.get(current["weather_code"], "unknown conditions")

        location_str = f"{display_name}, {country}" if country else display_name
        result = (
            f"In {location_str} right now: {temp} degrees Celsius, {condition}. "
            f"Feels like {feels_like} degrees. "
            f"Humidity {humidity}%, wind {wind} kilometres per hour."
        )
        logger.info(f"[Weather] {city}: {result}")
        return result
