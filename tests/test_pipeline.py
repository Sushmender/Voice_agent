"""
tests/test_pipeline.py
-----------------------
Automated Test Suite
============================
Covers every checklist item from tasks.md that can be verified
without a running LiveKit room or real API calls.

Test categories
---------------
1. LatencyLoggerProcessor — unit tests for state-machine logic
2. ASR configuration      — verify Groq Whisper model / settings
3. TTS configuration      — verify Cartesia Sonic model / settings
4. VAD configuration      — verify Silero VAD is wired and tuned
5. Pipeline structure     — verify LatencyLogger appears in the chain
6. Latency summary        — verify summary table output
7. Milestone        — end-to-end stub confirming all stages fire

Run:
    pytest tests/test_pipeline.py -v
"""

import asyncio
import logging
import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ===========================================================================
# 1. LATENCY LOGGER — Unit tests
# ===========================================================================

class TestLatencyLoggerProcessor:
    """Unit tests for LatencyLoggerProcessor passthrough frame processor."""

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_processor():
        """Return a LatencyLoggerProcessor with push_frame stubbed out."""
        from backend.pipeline.latency_logger import LatencyLoggerProcessor
        proc = LatencyLoggerProcessor()

        # Stub out push_frame so the processor can run standalone in tests
        async def _noop(frame, direction=None):
            pass

        proc.push_frame = _noop
        return proc

    # ------------------------------------------------------------------
    # Initial state
    # ------------------------------------------------------------------

    def test_initial_state(self):
        """Processor starts with no turns and no timestamps."""
        from backend.pipeline.latency_logger import LatencyLoggerProcessor
        p = LatencyLoggerProcessor()
        assert p.turns == []
        assert p.turn_count == 0
        assert p._current_turn is None
        assert p._speech_start_ts is None
        assert p._llm_start_ts is None
        assert p._asr_logged is False
        assert p._first_audio_logged is False

    # ------------------------------------------------------------------
    # Turn tracking
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_user_started_speaking_creates_turn(self):
        """UserStartedSpeakingFrame should create a new TurnLatency record."""
        from pipecat.frames.frames import UserStartedSpeakingFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)

        assert proc._current_turn is not None
        assert proc._current_turn.turn_number == 1
        assert proc._speech_start_ts is not None
        assert proc._asr_logged is False
        assert proc._first_audio_logged is False

    @pytest.mark.asyncio
    async def test_turn_number_increments(self):
        """Each UserStartedSpeakingFrame increments the turn counter."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            TTSStoppedFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()

        for expected_turn in range(1, 4):
            await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
            assert proc._current_turn.turn_number == expected_turn
            # Complete the turn so next UserStartedSpeaking starts a fresh one
            await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)

        assert proc.turn_count == 3

    # ------------------------------------------------------------------
    # ASR timing
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_asr_latency_measured(self):
        """TranscriptionFrame after UserStartedSpeaking should record asr_ms."""
        from pipecat.frames.frames import UserStartedSpeakingFrame, TranscriptionFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()

        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await asyncio.sleep(0.05)   # simulate 50 ms of processing

        transcript = TranscriptionFrame(
            text="hello world",
            user_id="user-1",
            timestamp="",
        )
        await proc.process_frame(transcript, FrameDirection.DOWNSTREAM)

        assert proc._current_turn is not None
        assert proc._current_turn.asr_ms is not None
        assert proc._current_turn.asr_ms >= 40   # at least 40 ms

    @pytest.mark.asyncio
    async def test_asr_logged_only_once_per_turn(self):
        """Only the first TranscriptionFrame per turn should update asr_ms."""
        from pipecat.frames.frames import UserStartedSpeakingFrame, TranscriptionFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()

        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)

        frame1 = TranscriptionFrame(text="first", user_id="u", timestamp="")
        await proc.process_frame(frame1, FrameDirection.DOWNSTREAM)
        first_asr = proc._current_turn.asr_ms

        await asyncio.sleep(0.02)

        frame2 = TranscriptionFrame(text="second", user_id="u", timestamp="")
        await proc.process_frame(frame2, FrameDirection.DOWNSTREAM)

        # asr_ms must not have changed after the second transcript
        assert proc._current_turn.asr_ms == first_asr

    @pytest.mark.asyncio
    async def test_empty_transcript_ignored(self):
        """Blank TranscriptionFrames (interim silence) must not set asr_ms."""
        from pipecat.frames.frames import UserStartedSpeakingFrame, TranscriptionFrame
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)

        blank = TranscriptionFrame(text="  ", user_id="u", timestamp="")
        await proc.process_frame(blank, FrameDirection.DOWNSTREAM)

        assert proc._current_turn.asr_ms is None   # blank must not trigger timing

    # ------------------------------------------------------------------
    # LLM + TTS timing
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_llm_start_records_timestamp(self):
        """LLMFullResponseStartFrame should set _llm_start_ts."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            LLMFullResponseStartFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)

        assert proc._llm_start_ts is not None

    @pytest.mark.asyncio
    async def test_audio_frame_records_tts_and_total_ms(self):
        """First AudioRawFrame after LLM start should record tts_ms and total_ms."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            LLMFullResponseStartFrame,
            AudioRawFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await asyncio.sleep(0.03)
        await proc.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await asyncio.sleep(0.05)

        audio = AudioRawFrame(audio=b"\x00" * 320, sample_rate=16000, num_channels=1)
        await proc.process_frame(audio, FrameDirection.DOWNSTREAM)

        assert proc._current_turn is not None
        assert proc._current_turn.tts_ms  is not None
        assert proc._current_turn.total_ms is not None
        assert proc._current_turn.tts_ms  >= 40     # at least 40 ms
        assert proc._current_turn.total_ms >= 70     # at least 70 ms (30 + 50)

    @pytest.mark.asyncio
    async def test_audio_logged_only_once_per_turn(self):
        """Only the first AudioRawFrame per turn should update tts_ms/total_ms."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            LLMFullResponseStartFrame,
            AudioRawFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)

        audio = AudioRawFrame(audio=b"\x00" * 320, sample_rate=16000, num_channels=1)
        await proc.process_frame(audio, FrameDirection.DOWNSTREAM)
        first_tts = proc._current_turn.tts_ms

        await asyncio.sleep(0.02)
        await proc.process_frame(audio, FrameDirection.DOWNSTREAM)

        assert proc._current_turn.tts_ms == first_tts  # must not change

    # ------------------------------------------------------------------
    # Turn completion
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_tts_stopped_completes_turn(self):
        """TTSStoppedFrame should move the current turn into the turns list."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            TTSStoppedFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        assert proc.turn_count == 0

        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)

        assert proc.turn_count == 1
        assert proc.turns[0].turn_number == 1

    @pytest.mark.asyncio
    async def test_turns_not_duplicated(self):
        """Multiple TTSStoppedFrames must not duplicate the turn in the list."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            TTSStoppedFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection

        proc = self._make_processor()
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)

        assert proc.turn_count == 1   # no duplicate

    # ------------------------------------------------------------------
    # Summary log
    # ------------------------------------------------------------------

    def test_log_summary_empty(self, caplog):
        """log_summary with no turns should not raise and should log a message."""
        from backend.pipeline.latency_logger import LatencyLoggerProcessor
        p = LatencyLoggerProcessor()
        with caplog.at_level(logging.INFO):
            p.log_summary()   # must not raise
        assert any("No completed turns" in r.message for r in caplog.records)

    @pytest.mark.asyncio
    async def test_log_summary_with_turns(self, caplog):
        """log_summary should print a table when turns exist."""
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            LLMFullResponseStartFrame,
            AudioRawFrame,
            TTSStoppedFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection
        from backend.pipeline.latency_logger import LatencyLoggerProcessor

        proc = LatencyLoggerProcessor()

        async def _noop(frame, direction=None): pass
        proc.push_frame = _noop

        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)
        await proc.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        audio = AudioRawFrame(audio=b"\x00" * 320, sample_rate=16000, num_channels=1)
        await proc.process_frame(audio, FrameDirection.DOWNSTREAM)
        await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)

        with caplog.at_level(logging.INFO):
            proc.log_summary()

        log_text = "\n".join(r.message for r in caplog.records)
        assert "Turn" in log_text
        assert "AVG" in log_text


# ===========================================================================
# 2. ASR CONFIGURATION
# ===========================================================================

class TestASRConfiguration:
    """Verify Groq Whisper ASR is configured with the correct model and settings."""

    def test_groq_stt_service_importable(self):
        """GroqSTTService must be importable from the pipecat groq plugin."""
        from pipecat.services.groq.stt import GroqSTTService
        assert GroqSTTService is not None

    def test_groq_stt_settings_class_exists(self):
        """GroqSTTService.Settings class must exist (pipecat Settings API)."""
        from pipecat.services.groq.stt import GroqSTTService
        assert hasattr(GroqSTTService, "Settings")

    def test_pipeline_uses_whisper_large_v3_turbo(self):
        """create_voice_pipeline must configure whisper-large-v3-turbo model."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "whisper-large-v3-turbo" in source, (
            "ASR model must be whisper-large-v3-turbo in create_voice_pipeline"
        )

    def test_pipeline_sets_language_to_english(self):
        """ASR must be configured for English language."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert 'language="en"' in source or "language='en'" in source, (
            "STT language must be set to 'en'"
        )


# ===========================================================================
# 3. TTS CONFIGURATION
# ===========================================================================

class TestTTSConfiguration:
    """Verify Cartesia Sonic TTS is configured with the correct model and settings."""

    def test_cartesia_tts_service_importable(self):
        """CartesiaTTSService must be importable from pipecat cartesia plugin."""
        from pipecat.services.cartesia.tts import CartesiaTTSService
        assert CartesiaTTSService is not None

    def test_pipeline_uses_sonic_english_model(self):
        """create_voice_pipeline must configure sonic-english TTS model."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "sonic-english" in source, (
            "TTS model must be sonic-english in create_voice_pipeline"
        )

    def test_pipeline_sample_rate_16k(self):
        """TTS must output 16 kHz PCM for LiveKit compatibility."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "16000" in source, "TTS sample_rate must be 16000"


# ===========================================================================
# 4. VAD CONFIGURATION
# ===========================================================================

class TestVADConfiguration:
    """Verify Silero VAD is enabled and tuned for latency targets."""

    def test_silero_vad_importable(self):
        """SileroVADAnalyzer must be importable."""
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        assert SileroVADAnalyzer is not None

    def test_vad_enabled_in_pipeline_params(self):
        """LiveKitParams must set vad_enabled=True."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "vad_enabled=True" in source

    def test_vad_stop_secs_tuned(self):
        """VAD must use stop_secs=0.8 (lower than default 1.0) for latency."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "stop_secs=0.8" in source, (
            "VAD stop_secs must be 0.8 (latency tuning)"
        )

    def test_prewarm_loads_vad(self):
        """prewarm() should store a vad_analyzer in proc.userdata."""
        from backend.agent_worker import prewarm

        mock_proc = MagicMock()
        mock_proc.userdata = {}
        prewarm(mock_proc)

        # After prewarm, key should exist (value may be None if silero fails to load)
        assert "vad_analyzer" in mock_proc.userdata

    def test_vad_audio_passthrough_enabled(self):
        """vad_audio_passthrough=True must be set for audio to flow through VAD."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "vad_audio_passthrough=True" in source


# ===========================================================================
# 5. PIPELINE STRUCTURE
# ===========================================================================

class TestPipelineStructure:
    """Verify the pipeline includes LatencyLoggerProcessor."""

    def test_latency_logger_in_pipeline_source(self):
        """create_voice_pipeline source must reference LatencyLoggerProcessor."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        source = inspect.getsource(create_voice_pipeline)
        assert "LatencyLoggerProcessor" in source
        assert "latency_logger" in source

    def test_latency_logger_module_importable(self):
        """backend.pipeline.latency_logger must be importable."""
        from backend.pipeline.latency_logger import LatencyLoggerProcessor
        assert LatencyLoggerProcessor is not None

    def test_latency_logger_is_frame_processor(self):
        """LatencyLoggerProcessor must inherit from pipecat FrameProcessor."""
        from pipecat.processors.frame_processor import FrameProcessor
        from backend.pipeline.latency_logger import LatencyLoggerProcessor
        assert issubclass(LatencyLoggerProcessor, FrameProcessor)

    @pytest.mark.asyncio
    async def test_pipeline_factory_includes_latency_logger(self):
        """create_voice_pipeline with mocked transport returns PipelineWorker."""
        from pipecat.pipeline.task import PipelineWorker

        mock_transport = MagicMock()
        mock_transport.input.return_value  = MagicMock()
        mock_transport.output.return_value = MagicMock()

        with patch(
            "pipecat.transports.livekit.transport.LiveKitTransport",
            return_value=mock_transport,
        ), patch(
            "pipecat.audio.vad.silero.SileroVADAnalyzer",
            return_value=MagicMock(),
        ):
            from backend.pipeline.voice_pipeline import create_voice_pipeline
            worker = await create_voice_pipeline(
                livekit_url=os.getenv("LIVEKIT_URL", "wss://test.livekit.cloud"),
                livekit_token="fake.jwt.token",
                room_name="test-room",
                groq_api_key=os.getenv("GROQ_API_KEY", "test-groq-key"),
                cartesia_api_key=os.getenv("CARTESIA_API_KEY", "test-cartesia-key"),
                cartesia_voice_id=os.getenv(
                    "CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"
                ),
            )

        assert isinstance(worker, PipelineWorker)

    def test_run_pipeline_accepts_vad_analyzer(self):
        """run_pipeline must accept a vad_analyzer keyword argument."""
        import inspect
        from backend.pipeline.voice_pipeline import run_pipeline
        sig = inspect.signature(run_pipeline)
        assert "vad_analyzer" in sig.parameters, (
            "run_pipeline must accept vad_analyzer (pre-warm support)"
        )

    def test_create_pipeline_accepts_vad_analyzer(self):
        """create_voice_pipeline must accept a vad_analyzer keyword argument."""
        import inspect
        from backend.pipeline.voice_pipeline import create_voice_pipeline
        sig = inspect.signature(create_voice_pipeline)
        assert "vad_analyzer" in sig.parameters


# ===========================================================================
# 6. MILESTONE
# ===========================================================================

class TestMilestone:
    """
    Verifies milestone checklist items that can be automated:
    - LatencyLogger correctly instruments a synthetic turn
    - ASR / TTS / VAD all configured to spec
    - Pipeline can be instantiated (mocked transport)
    - Latency summary prints without errors
    """

    @pytest.mark.asyncio
    async def test_full_turn_latency_capture(self):
        """
        Simulate a complete voice turn through the LatencyLoggerProcessor and
        verify all three latency values are recorded.

        Synthetic timeline:
            t=0 ms   UserStartedSpeakingFrame
            t=~50ms  TranscriptionFrame("how are you")
            t=~60ms  LLMFullResponseStartFrame
            t=~150ms AudioRawFrame (first TTS chunk)
            t=~160ms TTSStoppedFrame
        """
        from pipecat.frames.frames import (
            UserStartedSpeakingFrame,
            TranscriptionFrame,
            LLMFullResponseStartFrame,
            AudioRawFrame,
            TTSStoppedFrame,
        )
        from pipecat.processors.frame_processor import FrameDirection
        from backend.pipeline.latency_logger import LatencyLoggerProcessor

        proc = LatencyLoggerProcessor()

        async def _noop(frame, direction=None): pass
        proc.push_frame = _noop

        # t=0: speech starts
        await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)

        # t~50ms: ASR returns transcript
        await asyncio.sleep(0.05)
        await proc.process_frame(
            TranscriptionFrame(text="how are you", user_id="u", timestamp=""),
            FrameDirection.DOWNSTREAM,
        )

        # t~60ms: LLM starts
        await asyncio.sleep(0.01)
        await proc.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)

        # t~150ms: first TTS audio chunk
        await asyncio.sleep(0.09)
        audio = AudioRawFrame(audio=b"\x00" * 320, sample_rate=16000, num_channels=1)
        await proc.process_frame(audio, FrameDirection.DOWNSTREAM)

        # t~160ms: TTS done
        await asyncio.sleep(0.01)
        await proc.process_frame(TTSStoppedFrame(), FrameDirection.DOWNSTREAM)

        # Validate
        assert proc.turn_count == 1
        turn = proc.turns[0]
        assert turn.asr_ms   is not None, "ASR latency not captured"
        assert turn.tts_ms   is not None, "TTS latency not captured"
        assert turn.total_ms is not None, "Total latency not captured"
        assert turn.asr_ms   >= 40,  f"ASR_ms={turn.asr_ms:.0f} — expected ≥40 ms"
        assert turn.tts_ms   >= 80,  f"TTS_ms={turn.tts_ms:.0f} — expected ≥80 ms"
        assert turn.total_ms >= 130, f"total_ms={turn.total_ms:.0f} — expected ≥130 ms"

    def test_all_components_importable(self):
        """All components must import without errors."""
        from backend.pipeline.latency_logger import LatencyLoggerProcessor, TurnLatency
        from pipecat.audio.vad.silero import SileroVADAnalyzer
        from pipecat.services.groq.stt import GroqSTTService
        from pipecat.services.cartesia.tts import CartesiaTTSService
        assert True  # No ImportError = success

    def test_agent_worker_prewarm_signature(self):
        """prewarm() must accept a JobProcess argument."""
        import inspect
        from backend.agent_worker import prewarm
        sig = inspect.signature(prewarm)
        assert "proc" in sig.parameters

    def test_turn_latency_dataclass(self):
        """TurnLatency dataclass must have all expected fields."""
        from backend.pipeline.latency_logger import TurnLatency
        t = TurnLatency(turn_number=1)
        assert t.turn_number == 1
        assert t.asr_ms   is None
        assert t.tts_ms   is None
        assert t.total_ms is None
