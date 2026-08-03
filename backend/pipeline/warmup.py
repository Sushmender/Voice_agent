"""
backend/pipeline/warmup.py
--------------------------
Post-login warm-up: eliminates the cold-start latency on the first voice query.

Three things are warmed up after a successful login / signup:
  1. LangGraph graph  — compiled and cached (get_agent_graph singleton).
  2. Groq STT         — HTTP connection pool to api.groq.com opened with a
                        minimal silent audio request.
  3. Cerebras LLM     — HTTP connection pool to api.cerebras.ai opened with a
                        tiny 1-token chat completion.

A module-level flag (_warmup_done) ensures the whole routine runs at most
once per server process, no matter how many users log in.

Usage
-----
    from backend.pipeline.warmup import trigger_warmup
    asyncio.create_task(trigger_warmup())   # fire-and-forget
"""

import asyncio
import logging
import time

logger = logging.getLogger(__name__)

# Guard: only run once per server process
_warmup_done = False
_warmup_lock = asyncio.Lock()


async def _warm_langgraph() -> None:
    """Compile the LangGraph StateGraph and cache the singleton."""
    from backend.agent.graph import get_agent_graph

    get_agent_graph()
    logger.info("[Warmup] ✅ LangGraph graph compiled and cached")


async def _warm_groq() -> None:
    """
    Open the HTTP connection pool to Groq by sending a minimal transcription
    request with a tiny silent WAV (44-byte header, 0 audio samples).
    The response will be an empty / error transcription — that's fine.
    We only care about the TCP/TLS handshake happening now, not the result.
    """
    import httpx
    from backend.config import get_settings

    settings = get_settings()

    # Minimal valid WAV file: RIFF header + PCM 16-bit, 16kHz, mono, 0 samples
    # This is the smallest valid WAV that Groq's Whisper endpoint will accept
    # without throwing a hard parse error.  Even if it does error, the
    # connection pool is now open — that's all we need.
    silent_wav = (
        b"RIFF$\x00\x00\x00WAVEfmt "
        b"\x10\x00\x00\x00\x01\x00\x01\x00"  # PCM, 1 channel
        b"\x80>\x00\x00\x00}\x00\x00"        # 16000 Hz, byte-rate
        b"\x02\x00\x10\x00"                   # block-align, bits-per-sample
        b"data\x00\x00\x00\x00"              # 0 data bytes
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                files={"file": ("warmup.wav", silent_wav, "audio/wav")},
                data={"model": "whisper-large-v3-turbo", "language": "en"},
            )
        logger.info("[Warmup] ✅ Groq STT connection opened")
    except Exception as exc:
        # Warm-up failure must never propagate — just log and move on
        logger.debug(f"[Warmup] Groq warm-up ping finished (may have errored — that's OK): {exc}")


async def _warm_cerebras() -> None:
    """
    Open the HTTP connection pool to Cerebras by sending a 1-token
    chat completion with max_tokens=1.  Cost: effectively zero.
    """
    import openai
    from backend.config import get_settings

    settings = get_settings()

    try:
        client = openai.AsyncOpenAI(
            api_key=settings.cerebras_api_key,
            base_url=settings.cerebras_base_url,
        )
        await client.chat.completions.create(
            model=settings.cerebras_model,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=1,
        )
        logger.info("[Warmup] ✅ Cerebras LLM connection opened")
    except Exception as exc:
        logger.debug(f"[Warmup] Cerebras warm-up ping finished (may have errored — that's OK): {exc}")


async def run_warmup() -> None:
    """
    Run all three warm-ups concurrently.

    Called internally by trigger_warmup() — do not call directly.
    """
    t0 = time.perf_counter()
    logger.info("[Warmup] 🔥 Starting background warm-up (LangGraph + Groq + Cerebras)...")

    # Run all three in parallel — they are fully independent
    await asyncio.gather(
        _warm_langgraph(),
        _warm_groq(),
        _warm_cerebras(),
        return_exceptions=True,  # never raise — warmup must be silent
    )

    elapsed = time.perf_counter() - t0
    logger.info(f"[Warmup] 🚀 All services warmed up in {elapsed:.2f}s — first voice query will be fast!")


async def trigger_warmup() -> None:
    """
    Public entry point.  Safe to call from every login / signup handler.

    - Acquires a lock so only one warm-up task can run at a time.
    - Sets _warmup_done = True after the first successful run.
    - Subsequent calls return immediately without hitting any APIs.
    """
    global _warmup_done

    # Fast path — already done, skip without acquiring lock
    if _warmup_done:
        logger.debug("[Warmup] Already warmed up — skipping")
        return

    async with _warmup_lock:
        # Re-check inside the lock (another coroutine may have beaten us)
        if _warmup_done:
            logger.debug("[Warmup] Already warmed up — skipping (post-lock check)")
            return

        try:
            await run_warmup()
        except Exception as exc:
            # Should never reach here because run_warmup uses return_exceptions=True,
            # but be defensive just in case.
            logger.warning(f"[Warmup] Unexpected error during warm-up: {exc}")
        finally:
            # Mark done even if something failed — we don't want infinite retries
            _warmup_done = True
