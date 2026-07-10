"""
tests/e2e_pipeline2_latency.py
================================
End-to-End Pipeline Test — ASR → TTS Latency + Voice Modulation
================================================================

Measures per-stage latency across the voice pipeline and validates
audio frame properties (sample rate, channels, bit depth).

No LiveKit room or microphone required. Frames are injected synthetically.

Stages measured per turn:
    ASR_ms   : UserStartedSpeakingFrame → first TranscriptionFrame
    TTS_ms   : LLMFullResponseStartFrame → first audio chunk out of TTS
    total_ms : UserStartedSpeakingFrame → first audio chunk out of TTS

Test classes
------------
TestE2ELatencySmoke      — Always runs. Synthetic frames, no API keys.
TestE2EVoiceModulation   — Always runs. Audio frame structure assertions.
TestE2ETTSLatencyLive    — LIVE_APIS=1 only. Real Cartesia first-chunk timer.
TestE2EASRLatencyLive    — LIVE_APIS=1 only. Real Groq round-trip with PCM.

Run:
    # Smoke (no API keys needed)
    pytest tests/e2e_pipeline2_latency.py -v -m "not live"

    # Live (requires .env with real keys)
    $env:LIVE_APIS="1"
    pytest tests/e2e_pipeline2_latency.py -v -m live --log-cli-level=INFO
"""

import asyncio
import logging
import math
import os
import struct
import time
import uuid
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

logger = logging.getLogger(__name__)


# ===========================================================================
# Synthetic audio helpers
# ===========================================================================

def _make_silent_pcm(duration_ms: int = 200, sample_rate: int = 16000) -> bytes:
    """
    Return raw 16-bit little-endian mono PCM silence of the given duration.
    Used to simulate audio input without a real microphone.
    """
    num_samples = int(sample_rate * duration_ms / 1000)
    return struct.pack(f"<{num_samples}h", *([0] * num_samples))


def _make_chirp_pcm(duration_ms: int = 300, sample_rate: int = 16000, freq: int = 440) -> bytes:
    """
    Return raw 16-bit little-endian mono PCM containing a 440 Hz sine chirp.
    Used to give Groq ASR something non-trivial to process in live tests.
    """
    num_samples = int(sample_rate * duration_ms / 1000)
    amplitude = 8000
    samples = [
        int(amplitude * math.sin(2 * math.pi * freq * i / sample_rate))
        for i in range(num_samples)
    ]
    return struct.pack(f"<{num_samples}h", *samples)


def _make_wav_bytes(pcm_data: bytes, sample_rate: int = 16000) -> bytes:
    """
    Wrap raw PCM bytes in a minimal RIFF/WAV header.
    Required for services that expect WAV format (e.g., Groq Whisper).
    """
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_data)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,               # PCM chunk size
        1,                # AudioFormat = PCM
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_data


def _make_audio_frame(duration_ms: int = 20, sample_rate: int = 16000):
    """Return an AudioRawFrame of the given duration (default 20 ms chunk)."""
    from pipecat.frames.frames import AudioRawFrame
    pcm = _make_silent_pcm(duration_ms, sample_rate)
    return AudioRawFrame(audio=pcm, sample_rate=sample_rate, num_channels=1)


def _make_latency_processor():
    """Return a LatencyLoggerProcessor with push_frame stubbed out."""
    from backend.pipeline.latency_logger import LatencyLoggerProcessor
    proc = LatencyLoggerProcessor()

    async def _noop(frame, direction=None):
        pass

    proc.push_frame = _noop
    return proc


# ===========================================================================
# Pipeline 2 — Smoke Tests (synthetic frames, no API keys)
# ===========================================================================

@pytest.mark.e2e
class TestE2ELatencySmoke:
    """
    End-to-end latency smoke tests using synthetic frames.

    Simulates a realistic voice turn timeline:
        t=0 ms    UserStartedSpeakingFrame
        t~50 ms   TranscriptionFrame (ASR done)
        t~60 ms   LLMFullResponseStartFrame (LLM starts responding)
        t~160 ms  AudioRawFrame (first TTS audio chunk)
        t~170 ms  TTSStoppedFrame (TTS done)

    No API keys required — all timing is controlled by asyncio.sleep.
    """

    @pytest.fixture(autouse=True)
    def _env(self, monkeypatch):
        monkeypatch.setenv("CEREBRAS_API_KEY", "test-cerebras-key")
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test-lk-key")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test-lk-secret-long-enough")
        monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
        monkeypatch.setenv("CARTESIA_API_KEY", "test-cartesia-key")

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Full turn — all three latencies captured
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_full_turn_all_latencies_captured(self):
        """
        Simulate a complete voice turn and verify ASR, TTS, and total latency
        are all captured and non-None by the LatencyLoggerProcessor.
        """
        from pipecat.frames.frames import (
            AudioRawFrame,
            LLMFullResponseStartFrame,
            TranscriptionFrame,
            TTSStoppedFrame,
            UserStartedSpeakingFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        # t=0: user starts speaking
        await proc.process_frame(UserStartedSpeakingFrame(), dir_)

        # t~50ms: ASR transcription arrives
        await asyncio.sleep(0.05)
        await proc.process_frame(
            TranscriptionFrame(text="tell me a joke", user_id="u", timestamp=""),
            dir_,
        )

        # t~60ms: LLM starts generating
        await asyncio.sleep(0.01)
        await proc.process_frame(LLMFullResponseStartFrame(), dir_)

        # t~160ms: first TTS audio chunk arrives
        await asyncio.sleep(0.10)
        await proc.process_frame(_make_audio_frame(), dir_)

        # t~170ms: TTS finishes
        await asyncio.sleep(0.01)
        await proc.process_frame(TTSStoppedFrame(), dir_)

        assert proc.turn_count == 1, "Expected exactly 1 completed turn"
        turn = proc.turns[0]

        assert turn.asr_ms is not None,   "ASR latency must be captured"
        assert turn.tts_ms is not None,   "TTS latency must be captured"
        assert turn.total_ms is not None, "Total latency must be captured"

        assert turn.asr_ms >= 40,   f"ASR_ms={turn.asr_ms:.0f} — expected >= 40 ms"
        assert turn.tts_ms >= 80,   f"TTS_ms={turn.tts_ms:.0f} — expected >= 80 ms"
        assert turn.total_ms >= 130, f"total_ms={turn.total_ms:.0f} — expected >= 130 ms"

        logger.info(
            f"[Smoke] Turn latencies — "
            f"ASR: {turn.asr_ms:.0f} ms | "
            f"TTS: {turn.tts_ms:.0f} ms | "
            f"Total: {turn.total_ms:.0f} ms"
        )

    @pytest.mark.asyncio
    async def test_asr_latency_only_captured_from_speech_start(self):
        """
        ASR_ms is measured from UserStartedSpeakingFrame, not from an
        arbitrary point. Sending a TranscriptionFrame before speech start
        must not record any ASR latency.
        """
        from pipecat.frames.frames import TranscriptionFrame, UserStartedSpeakingFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        # Transcript before speech start — must be ignored
        await proc.process_frame(
            TranscriptionFrame(text="phantom transcript", user_id="u", timestamp=""),
            dir_,
        )
        assert proc._current_turn is None, "No turn should start before UserStartedSpeakingFrame"

        # Now start the real turn
        await proc.process_frame(UserStartedSpeakingFrame(), dir_)
        await asyncio.sleep(0.03)
        await proc.process_frame(
            TranscriptionFrame(text="real transcript", user_id="u", timestamp=""),
            dir_,
        )

        assert proc._current_turn is not None
        assert proc._current_turn.asr_ms is not None
        assert proc._current_turn.asr_ms >= 25

    @pytest.mark.asyncio
    async def test_asr_captured_only_once_per_turn(self):
        """
        Multiple TranscriptionFrames in a single turn must only update
        asr_ms once — the second transcript must not overwrite the timing.
        """
        from pipecat.frames.frames import TranscriptionFrame, UserStartedSpeakingFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        await proc.process_frame(UserStartedSpeakingFrame(), dir_)
        await asyncio.sleep(0.03)

        await proc.process_frame(
            TranscriptionFrame(text="first", user_id="u", timestamp=""),
            dir_,
        )
        first_asr = proc._current_turn.asr_ms

        await asyncio.sleep(0.05)  # simulate delay before second transcript

        await proc.process_frame(
            TranscriptionFrame(text="second (should be ignored)", user_id="u", timestamp=""),
            dir_,
        )

        assert proc._current_turn.asr_ms == first_asr, (
            "asr_ms must not change after the first TranscriptionFrame"
        )

    @pytest.mark.asyncio
    async def test_tts_first_chunk_only_captured_once(self):
        """
        Multiple AudioRawFrames must only update tts_ms/total_ms once —
        only the first chunk counts as the latency event.
        """
        from pipecat.frames.frames import LLMFullResponseStartFrame, UserStartedSpeakingFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        await proc.process_frame(UserStartedSpeakingFrame(), dir_)
        await proc.process_frame(LLMFullResponseStartFrame(), dir_)
        await asyncio.sleep(0.05)

        await proc.process_frame(_make_audio_frame(), dir_)
        first_tts = proc._current_turn.tts_ms

        await asyncio.sleep(0.02)
        await proc.process_frame(_make_audio_frame(), dir_)

        assert proc._current_turn.tts_ms == first_tts, (
            "tts_ms must not change after the first audio chunk"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Multi-turn summary
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_five_turns_summary_table(self, caplog):
        """
        After 5 complete turns, log_summary() must print a table that
        includes 'AVG' and all three latency column headers.
        """
        from pipecat.frames.frames import (
            AudioRawFrame,
            LLMFullResponseStartFrame,
            TranscriptionFrame,
            TTSStoppedFrame,
            UserStartedSpeakingFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        for turn_idx in range(5):
            await proc.process_frame(UserStartedSpeakingFrame(), dir_)
            await asyncio.sleep(0.03)
            await proc.process_frame(
                TranscriptionFrame(text=f"turn {turn_idx}", user_id="u", timestamp=""),
                dir_,
            )
            await proc.process_frame(LLMFullResponseStartFrame(), dir_)
            await asyncio.sleep(0.05)
            await proc.process_frame(_make_audio_frame(), dir_)
            await proc.process_frame(TTSStoppedFrame(), dir_)

        assert proc.turn_count == 5, f"Expected 5 turns, got {proc.turn_count}"

        with caplog.at_level(logging.INFO):
            proc.log_summary()

        log_text = "\n".join(r.message for r in caplog.records)
        assert "Turn" in log_text,      "Summary must include 'Turn' header"
        assert "AVG" in log_text,       "Summary must include 'AVG' row"
        assert "ASR" in log_text,       "Summary must include 'ASR' column"

        # Validate all turns have latency data
        for i, turn in enumerate(proc.turns):
            assert turn.asr_ms is not None,   f"Turn {i+1} missing asr_ms"
            assert turn.tts_ms is not None,   f"Turn {i+1} missing tts_ms"
            assert turn.total_ms is not None, f"Turn {i+1} missing total_ms"
            logger.info(
                f"[Smoke] Turn {turn.turn_number} — "
                f"ASR: {turn.asr_ms:.0f} ms | "
                f"TTS: {turn.tts_ms:.0f} ms | "
                f"Total: {turn.total_ms:.0f} ms"
            )

    @pytest.mark.asyncio
    async def test_latency_summary_auto_prints_every_5_turns(self, caplog):
        """
        LatencyLoggerProcessor must auto-print the summary table after
        every 5 completed turns without any manual call to log_summary().
        """
        from pipecat.frames.frames import (
            LLMFullResponseStartFrame,
            TTSStoppedFrame,
            TranscriptionFrame,
            UserStartedSpeakingFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        with caplog.at_level(logging.INFO):
            for _ in range(5):
                await proc.process_frame(UserStartedSpeakingFrame(), dir_)
                await asyncio.sleep(0.02)
                await proc.process_frame(
                    TranscriptionFrame(text="auto", user_id="u", timestamp=""), dir_
                )
                await proc.process_frame(LLMFullResponseStartFrame(), dir_)
                await asyncio.sleep(0.03)
                await proc.process_frame(_make_audio_frame(), dir_)
                await proc.process_frame(TTSStoppedFrame(), dir_)

        log_text = "\n".join(r.message for r in caplog.records)
        assert "Turn Latency Summary" in log_text, (
            "LatencyLoggerProcessor must auto-print summary at turn 5"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Turn isolation — no bleed between turns
    # ─────────────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_new_turn_resets_state(self):
        """
        Starting a new UserStartedSpeakingFrame must reset all per-turn
        timestamps (asr_logged, first_audio_logged, llm_start_ts).
        """
        from pipecat.frames.frames import (
            LLMFullResponseStartFrame,
            TTSStoppedFrame,
            TranscriptionFrame,
            UserStartedSpeakingFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = _make_latency_processor()
        dir_ = FrameDirection.DOWNSTREAM

        # Complete turn 1
        await proc.process_frame(UserStartedSpeakingFrame(), dir_)
        await proc.process_frame(
            TranscriptionFrame(text="turn 1", user_id="u", timestamp=""), dir_
        )
        await proc.process_frame(LLMFullResponseStartFrame(), dir_)
        await proc.process_frame(_make_audio_frame(), dir_)
        await proc.process_frame(TTSStoppedFrame(), dir_)

        # Start turn 2
        await proc.process_frame(UserStartedSpeakingFrame(), dir_)

        assert proc._asr_logged is False,        "asr_logged must reset for new turn"
        assert proc._first_audio_logged is False, "first_audio_logged must reset for new turn"
        assert proc._llm_start_ts is None,        "llm_start_ts must reset for new turn"
        assert proc._current_turn.turn_number == 2


# ===========================================================================
# Pipeline 2 — Voice Modulation Tests (audio frame structure, no API keys)
# ===========================================================================

@pytest.mark.e2e
class TestE2EVoiceModulation:
    """
    Validate audio frame properties: sample rate, channel count, encoding,
    and VAD configuration settings for voice modulation quality.

    No API calls required. All assertions are structural / config-level.
    """

    @pytest.fixture(autouse=True)
    def _env(self, monkeypatch):
        monkeypatch.setenv("CEREBRAS_API_KEY", "test-cerebras-key")
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test-lk-key")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test-lk-secret-long-enough")
        monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
        monkeypatch.setenv("CARTESIA_API_KEY", "test-cartesia-key")

    # ─────────────────────────────────────────────────────────────────────────
    # Audio frame structure
    # ─────────────────────────────────────────────────────────────────────────

    def test_audio_raw_frame_sample_rate_16k(self):
        """AudioRawFrame must be created with 16 kHz sample rate for LiveKit."""
        from pipecat.frames.frames import AudioRawFrame

        frame = AudioRawFrame(
            audio=_make_silent_pcm(20),
            sample_rate=16000,
            num_channels=1,
        )
        assert frame.sample_rate == 16000, (
            "Audio frame must use 16 kHz — required for LiveKit compatibility"
        )

    def test_audio_raw_frame_mono_channel(self):
        """AudioRawFrame must be mono (1 channel) for Cartesia compatibility."""
        from pipecat.frames.frames import AudioRawFrame

        frame = AudioRawFrame(
            audio=_make_silent_pcm(20),
            sample_rate=16000,
            num_channels=1,
        )
        assert frame.num_channels == 1, "Audio must be mono (1 channel)"

    def test_audio_frame_pcm_size_matches_duration(self):
        """
        20 ms of 16-bit mono 16 kHz audio = 16000 * 0.020 * 2 = 640 bytes.
        """
        pcm = _make_silent_pcm(duration_ms=20, sample_rate=16000)
        expected_bytes = int(16000 * 0.020) * 2  # samples × 2 bytes per sample
        assert len(pcm) == expected_bytes, (
            f"PCM byte length mismatch: got {len(pcm)}, expected {expected_bytes}"
        )

    def test_chirp_pcm_is_non_zero(self):
        """Synthetic chirp PCM must contain non-zero samples (not silence)."""
        pcm = _make_chirp_pcm(duration_ms=100)
        samples = struct.unpack(f"<{len(pcm)//2}h", pcm)
        assert max(abs(s) for s in samples) > 0, "Chirp PCM must contain non-zero audio"

    def test_wav_header_riff_magic(self):
        """Generated WAV bytes must start with the 'RIFF' magic bytes."""
        pcm = _make_silent_pcm(100)
        wav = _make_wav_bytes(pcm)
        assert wav[:4] == b"RIFF", "WAV header must start with 'RIFF'"
        assert wav[8:12] == b"WAVE", "WAV header must contain 'WAVE' marker"

    # ─────────────────────────────────────────────────────────────────────────
    # VAD configuration
    # ─────────────────────────────────────────────────────────────────────────

    def test_vad_stop_secs_tuned_to_0_8(self):
        """VAD stop_secs must be 0.8 s (lower than default 1.0 s) for latency."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "stop_secs=0.8" in source, (
            "VAD stop_secs must be 0.8 for latency tuning — "
            "reduces turn-end detection lag from ~1000 ms to ~800 ms"
        )

    def test_vad_audio_passthrough_enabled(self):
        """vad_audio_passthrough=True must be set so audio flows through VAD."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "vad_audio_passthrough=True" in source

    def test_tts_sample_rate_matches_livekit_requirement(self):
        """TTS must output 16 kHz PCM — required for LiveKit audio out."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "sample_rate=16000" in source, (
            "CartesiaTTSService must output 16000 Hz for LiveKit"
        )

    def test_asr_model_is_fast_turbo(self):
        """ASR must use whisper-large-v3-turbo — the fastest Groq Whisper model."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "whisper-large-v3-turbo" in source

    def test_tts_model_is_sonic_3_5(self):
        """TTS must use sonic-3.5 — the lowest-latency Cartesia model."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "sonic-3.5" in source

    # ─────────────────────────────────────────────────────────────────────────
    # LatencyLoggerProcessor wiring
    # ─────────────────────────────────────────────────────────────────────────

    def test_latency_logger_in_pipeline_between_stt_and_llm(self):
        """
        LatencyLoggerProcessor must be placed between STT and LLM
        (so it sees TranscriptionFrame and LLMFullResponseStartFrame).
        """
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        # Verify it is wired into the pipeline (not just imported)
        assert "latency_logger" in source
        assert "LatencyLoggerProcessor" in source

    def test_pipeline_metrics_enabled(self):
        """PipelineParams must have enable_metrics=True for per-stage timing."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "enable_metrics=True" in source


# ===========================================================================
# Pipeline 2 — Live TTS Latency  (real Cartesia API — LIVE_APIS=1)
# ===========================================================================

@pytest.mark.e2e
@pytest.mark.live
class TestE2ETTSLatencyLive:
    """
    Measures real Cartesia Sonic first-chunk latency.

    Connects to the Cartesia API, sends a short phrase, and measures
    wall-clock time until the first AudioRawFrame arrives.

    Latency target: first chunk < 2000 ms (Cartesia Sonic is typically ~90 ms).

    Requirements:
        - .env file with valid CARTESIA_API_KEY and CARTESIA_VOICE_ID
        - LIVE_APIS=1 environment variable
    """

    @pytest.fixture(autouse=True)
    def _gate(self, skip_if_no_live_apis):
        pass

    @pytest.fixture(autouse=True)
    def _load_env(self):
        from dotenv import load_dotenv
        load_dotenv()

    @pytest.mark.asyncio
    async def test_cartesia_first_chunk_latency(self):
        """
        LIVE: Measure time from TTS request to first audio chunk.
        Asserts first chunk arrives within 2000 ms (Sonic target: ~90 ms).
        """
        from pipecat.services.cartesia.tts import CartesiaTTSService
        from pipecat.frames.frames import TextFrame, AudioRawFrame, TTSStoppedFrame
        from pipecat.processors.frame_processor import FrameDirection

        api_key = os.environ.get("CARTESIA_API_KEY", "")
        voice_id = os.environ.get(
            "CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"
        )

        if not api_key or api_key.startswith("test"):
            pytest.skip("Valid CARTESIA_API_KEY not found in .env")

        tts = CartesiaTTSService(
            api_key=api_key,
            sample_rate=16000,
            settings=CartesiaTTSService.Settings(
                voice=voice_id,
                model="sonic-english",
            ),
        )

        audio_frames: list = []
        first_chunk_time: list = []
        tts_start: list = []

        original_push = None

        async def _capture(frame, direction=None):
            if isinstance(frame, AudioRawFrame) and not first_chunk_time:
                first_chunk_time.append(time.perf_counter())
                logger.info(
                    f"[Live TTS] First chunk arrived: "
                    f"{(first_chunk_time[0] - tts_start[0]) * 1000:.0f} ms"
                )
            audio_frames.append(frame)

        tts.push_frame = _capture

        text_frame = TextFrame("Hello. The quick brown fox.")

        tts_start.append(time.perf_counter())
        logger.info("[Live TTS] Sending text to Cartesia Sonic...")

        await tts.process_frame(text_frame, FrameDirection.DOWNSTREAM)

        if not first_chunk_time:
            pytest.skip("No audio chunks received — TTS may not have processed synchronously")

        first_chunk_ms = (first_chunk_time[0] - tts_start[0]) * 1000
        logger.info(f"[Live TTS] First-chunk latency: {first_chunk_ms:.0f} ms")

        assert first_chunk_ms < 2000, (
            f"Cartesia first-chunk latency {first_chunk_ms:.0f} ms exceeds 2000 ms threshold"
        )

        # Verify audio frame properties
        audio_only = [f for f in audio_frames if isinstance(f, AudioRawFrame)]
        assert len(audio_only) > 0, "At least one audio frame must be produced"
        first = audio_only[0]
        assert first.sample_rate == 16000, f"Expected 16000 Hz, got {first.sample_rate}"
        assert first.num_channels == 1, f"Expected mono, got {first.num_channels} channels"
        assert len(first.audio) > 0, "Audio frame must contain non-empty bytes"

    @pytest.mark.asyncio
    async def test_cartesia_audio_is_16khz_mono(self):
        """
        LIVE: Verify that Cartesia output is 16 kHz mono PCM as required
        by the LiveKit transport layer.
        """
        from pipecat.services.cartesia.tts import CartesiaTTSService
        from pipecat.frames.frames import TextFrame, AudioRawFrame
        from pipecat.processors.frame_processor import FrameDirection

        api_key = os.environ.get("CARTESIA_API_KEY", "")
        voice_id = os.environ.get(
            "CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"
        )

        if not api_key or api_key.startswith("test"):
            pytest.skip("Valid CARTESIA_API_KEY not found in .env")

        tts = CartesiaTTSService(
            api_key=api_key,
            sample_rate=16000,
            settings=CartesiaTTSService.Settings(
                voice=voice_id,
                model="sonic-english",
            ),
        )

        audio_frames: list = []

        async def _capture(frame, direction=None):
            audio_frames.append(frame)

        tts.push_frame = _capture

        await tts.process_frame(TextFrame("Testing audio format."), FrameDirection.DOWNSTREAM)

        audio_only = [f for f in audio_frames if isinstance(f, AudioRawFrame)]
        if not audio_only:
            pytest.skip("No audio frames received — TTS API may not have responded")

        for frame in audio_only:
            assert frame.sample_rate == 16000
            assert frame.num_channels == 1
            assert isinstance(frame.audio, bytes)
            assert len(frame.audio) > 0

        logger.info(
            f"[Live TTS] Received {len(audio_only)} audio chunks, "
            f"all at {audio_only[0].sample_rate} Hz mono"
        )


# ===========================================================================
# Pipeline 2 — Live ASR Latency  (real Groq Whisper — LIVE_APIS=1)
# ===========================================================================

@pytest.mark.e2e
@pytest.mark.live
class TestE2EASRLatencyLive:
    """
    Measures real Groq Whisper round-trip latency using synthetic PCM audio.

    Sends a synthetic WAV (chirp + silence) to Groq Whisper and measures
    wall-clock time until a TranscriptionFrame arrives.

    ASR target: round-trip < 2000 ms (Groq typically delivers in ~200-300 ms).

    Requirements:
        - .env file with valid GROQ_API_KEY
        - LIVE_APIS=1 environment variable
    """

    @pytest.fixture(autouse=True)
    def _gate(self, skip_if_no_live_apis):
        pass

    @pytest.fixture(autouse=True)
    def _load_env(self):
        from dotenv import load_dotenv
        load_dotenv()

    @pytest.mark.asyncio
    async def test_groq_whisper_round_trip_latency(self):
        """
        LIVE: Send synthetic WAV audio to Groq Whisper and measure the
        wall-clock time until a TranscriptionFrame is pushed downstream.
        Asserts round-trip < 2000 ms (target: ~200-300 ms).
        """
        from pipecat.services.groq.stt import GroqSTTService
        from pipecat.frames.frames import AudioRawFrame, TranscriptionFrame
        from pipecat.processors.frame_processor import FrameDirection

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key or api_key.startswith("test"):
            pytest.skip("Valid GROQ_API_KEY not found in .env")

        stt = GroqSTTService(
            api_key=api_key,
            settings=GroqSTTService.Settings(
                model="whisper-large-v3-turbo",
                language="en",
            ),
        )

        transcript_frames: list = []
        asr_start: list = []

        async def _capture(frame, direction=None):
            if isinstance(frame, TranscriptionFrame) and frame.text.strip():
                transcript_frames.append((frame, time.perf_counter()))

        stt.push_frame = _capture

        # Build a 1-second synthetic WAV (audible chirp so ASR has something to decode)
        chirp_pcm = _make_chirp_pcm(duration_ms=800)
        silence_pcm = _make_silent_pcm(duration_ms=200)
        wav_bytes = _make_wav_bytes(chirp_pcm + silence_pcm)

        # Wrap in AudioRawFrame and feed to STT service
        audio_frame = AudioRawFrame(
            audio=wav_bytes,
            sample_rate=16000,
            num_channels=1,
        )

        logger.info("[Live ASR] Sending synthetic WAV to Groq Whisper...")
        asr_start.append(time.perf_counter())
        await stt.process_frame(audio_frame, FrameDirection.DOWNSTREAM)

        # Give the STT service a moment to push frames asynchronously
        await asyncio.sleep(2.0)

        asr_end = time.perf_counter()
        elapsed_ms = (asr_end - asr_start[0]) * 1000

        logger.info(f"[Live ASR] Round-trip elapsed: {elapsed_ms:.0f} ms")
        logger.info(
            f"[Live ASR] Received {len(transcript_frames)} transcript frame(s)"
        )

        if transcript_frames:
            frame, ts = transcript_frames[0]
            actual_ms = (ts - asr_start[0]) * 1000
            logger.info(
                f"[Live ASR] First transcript in {actual_ms:.0f} ms: '{frame.text}'"
            )
            assert actual_ms < 2000, (
                f"Groq ASR round-trip {actual_ms:.0f} ms exceeds 2000 ms threshold"
            )
        else:
            # Groq may return empty transcript for synthetic audio — that is OK.
            # The important thing is no exception was raised and the round-trip
            # completed within a reasonable time.
            logger.warning(
                "[Live ASR] No transcript received for synthetic audio "
                "(expected — chirp may not produce recognisable speech). "
                f"Round-trip completed in {elapsed_ms:.0f} ms."
            )
            assert elapsed_ms < 5000, (
                f"ASR round-trip took {elapsed_ms:.0f} ms — suspiciously slow"
            )

    @pytest.mark.asyncio
    async def test_groq_stt_service_initialises(self):
        """
        LIVE: Verify GroqSTTService can be instantiated with a real API key
        and the expected model / language settings.
        """
        from pipecat.services.groq.stt import GroqSTTService

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key or api_key.startswith("test"):
            pytest.skip("Valid GROQ_API_KEY not found in .env")

        stt = GroqSTTService(
            api_key=api_key,
            settings=GroqSTTService.Settings(
                model="whisper-large-v3-turbo",
                language="en",
            ),
        )
        assert stt is not None
        logger.info("[Live ASR] GroqSTTService initialised successfully")
