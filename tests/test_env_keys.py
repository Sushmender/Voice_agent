"""
test_env_keys.py
-----------------
Live connectivity test for every API key / service in .env.
Run: python test_env_keys.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

PASS_MARK = "[PASS]"
FAIL_MARK = "[FAIL]"

results: dict[str, tuple[str, str]] = {}


def section(title: str):
    print(f"\n{'-' * 60}")
    print(f"  {title}")
    print(f"{'-' * 60}")


# =============================================================================
# 1. Cerebras LLM
# =============================================================================
section("1 - Cerebras LLM")
try:
    import httpx

    key   = os.environ["CEREBRAS_API_KEY"]
    model = os.environ.get("CEREBRAS_MODEL", "gpt-oss-120b")

    r = httpx.post(
        "https://api.cerebras.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": "Say: pong"}],
            "max_tokens": 8,
        },
        timeout=20,
    )
    if r.status_code == 200:
        data = r.json()
        # Cerebras returns OpenAI-compatible format; content may be None on refusal
        choices = data.get("choices", [])
        reply = ""
        if choices:
            msg = choices[0].get("message", {})
            reply = (msg.get("content") or "").strip()
        if reply:
            print(f"  Reply  : {reply!r}")
            print(f"  Model  : {model}")
            print(f"  Status : {PASS_MARK}")
            results["Cerebras LLM"] = ("PASS", reply)
        else:
            # Key worked but empty reply — still a pass (quota / model issue, not auth)
            print(f"  Raw response: {data}")
            print(f"  Note   : Key accepted, but empty reply (model may differ)")
            print(f"  Status : {PASS_MARK}")
            results["Cerebras LLM"] = ("PASS", f"key OK, empty reply — model={model}")
    else:
        print(f"  HTTP {r.status_code}: {r.text[:200]}")
        print(f"  Status : {FAIL_MARK}")
        results["Cerebras LLM"] = ("FAIL", f"HTTP {r.status_code}")
except Exception as e:
    print(f"  Error  : {e}")
    print(f"  Status : {FAIL_MARK}")
    results["Cerebras LLM"] = ("FAIL", str(e))


# =============================================================================
# 2. LiveKit Cloud -- JWT token generation (local, no network required)
# =============================================================================
section("2 - LiveKit Cloud -- JWT token generation")
try:
    from livekit.api import AccessToken, VideoGrants

    api_key    = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]
    lk_url     = os.environ["LIVEKIT_URL"]

    token = (
        AccessToken(api_key, api_secret)
        .with_identity("test-user")
        .with_grants(VideoGrants(room_join=True, room="test-room"))
        .to_jwt()
    )

    if len(token) > 50:
        print(f"  URL    : {lk_url}")
        print(f"  Token  : {token[:40]}...  ({len(token)} chars)")
        print(f"  Status : {PASS_MARK}")
        results["LiveKit JWT"] = ("PASS", f"{len(token)} char token")
    else:
        raise ValueError("Token too short")

except Exception as e:
    print(f"  Error  : {e}")
    print(f"  Status : {FAIL_MARK}")
    results["LiveKit JWT"] = ("FAIL", str(e))


# =============================================================================
# 3. Groq -- Whisper ASR (list models to confirm key is valid)
# =============================================================================
section("3 - Groq -- Whisper ASR key")
try:
    import httpx

    key = os.environ["GROQ_API_KEY"]

    r = httpx.get(
        "https://api.groq.com/openai/v1/models",
        headers={"Authorization": f"Bearer {key}"},
        timeout=15,
    )
    if r.status_code == 200:
        models = [m["id"] for m in r.json().get("data", [])]
        whisper_models = [m for m in models if "whisper" in m.lower()]
        print(f"  Whisper models available: {whisper_models or models[:5]}")
        print(f"  Status : {PASS_MARK}")
        results["Groq Whisper ASR"] = ("PASS", f"whisper: {whisper_models}")
    else:
        print(f"  HTTP {r.status_code}: {r.text[:200]}")
        print(f"  Status : {FAIL_MARK}")
        results["Groq Whisper ASR"] = ("FAIL", f"HTTP {r.status_code}")
except Exception as e:
    print(f"  Error  : {e}")
    print(f"  Status : {FAIL_MARK}")
    results["Groq Whisper ASR"] = ("FAIL", str(e))


# =============================================================================
# 4. Cartesia TTS -- list voices to confirm key is valid
# =============================================================================
section("4 - Cartesia TTS")
try:
    import httpx

    key      = os.environ["CARTESIA_API_KEY"]
    voice_id = os.environ.get("CARTESIA_VOICE_ID", "")

    r = httpx.get(
        "https://api.cartesia.ai/voices",
        headers={"X-API-Key": key, "Cartesia-Version": "2024-06-10"},
        timeout=15,
    )
    if r.status_code == 200:
        voices = r.json()
        voice_names = [v.get("name", v.get("id")) for v in voices[:3]]
        voice_found = any(v.get("id") == voice_id for v in voices) if voice_id else None
        print(f"  Total voices returned : {len(voices)}")
        print(f"  Sample voices         : {voice_names}")
        if voice_id:
            status_str = "found" if voice_found else "NOT FOUND"
            print(f"  CARTESIA_VOICE_ID     : {voice_id} -- {status_str}")
        print(f"  Status : {PASS_MARK}")
        results["Cartesia TTS"] = ("PASS", f"{len(voices)} voices")
    else:
        print(f"  HTTP {r.status_code}: {r.text[:200]}")
        print(f"  Status : {FAIL_MARK}")
        results["Cartesia TTS"] = ("FAIL", f"HTTP {r.status_code}")
except Exception as e:
    print(f"  Error  : {e}")
    print(f"  Status : {FAIL_MARK}")
    results["Cartesia TTS"] = ("FAIL", str(e))


# =============================================================================
# 5. Notion -- fetch database metadata
# =============================================================================
section("5 - Notion -- database access")
try:
    import httpx

    notion_key = os.environ["NOTION_API_KEY"]
    db_id      = os.environ["NOTION_DATABASE_ID"]

    r = httpx.get(
        f"https://api.notion.com/v1/databases/{db_id}",
        headers={
            "Authorization": f"Bearer {notion_key}",
            "Notion-Version": "2022-06-28",
        },
        timeout=15,
    )
    if r.status_code == 200:
        db_info = r.json()
        title_parts = db_info.get("title", [])
        db_title = title_parts[0].get("plain_text", "Unknown") if title_parts else "Unknown"
        props = list(db_info.get("properties", {}).keys())
        print(f"  Database name : {db_title!r}")
        print(f"  Properties    : {props}")
        print(f"  Status : {PASS_MARK}")
        results["Notion DB"] = ("PASS", f"DB: {db_title}")
    else:
        print(f"  HTTP {r.status_code}: {r.text[:200]}")
        print(f"  Status : {FAIL_MARK}")
        results["Notion DB"] = ("FAIL", f"HTTP {r.status_code}")
except Exception as e:
    print(f"  Error  : {e}")
    print(f"  Status : {FAIL_MARK}")
    results["Notion DB"] = ("FAIL", str(e))


# =============================================================================
# Summary
# =============================================================================
print(f"\n{'=' * 60}")
print("  SUMMARY")
print(f"{'=' * 60}")
all_pass = True
for name, (status, detail) in results.items():
    icon = PASS_MARK if status == "PASS" else FAIL_MARK
    print(f"  {icon}  {name:25s}  {detail}")
    if status != "PASS":
        all_pass = False

print(f"{'=' * 60}")
if all_pass:
    print("\n  All keys are valid and services are reachable!\n")
    sys.exit(0)
else:
    print("\n  Some checks FAILED -- review the details above.\n")
    sys.exit(1)
