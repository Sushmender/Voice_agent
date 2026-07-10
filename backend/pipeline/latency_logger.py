"""
backend/pipeline/latency_logger.py
------------------------------------
LatencyLoggerProcessor — a passthrough FrameProcessor inserted into the
Pipecat pipeline to measure per-stage latency without disrupting the audio flow.

Measured stages per turn
------------------------
  ASR_ms   : UserStartedSpeakingFrame  →  first TranscriptionFrame
  TTS_ms   : LLMFullResponseStartFrame →  first audio chunk out of TTS
  total_ms : UserStartedSpeakingFrame  →  first audio chunk out of TTS

Usage
-----
    from backend.pipeline.latency_logger import LatencyLoggerProcessor

    latency_logger = LatencyLoggerProcessor()

    pipeline = Pipeline([
        transport.input(),
        stt,
        latency_logger,   # sits between STT and LLM — sees all downstream frames
        llm,
        tts,
        transport.output(),
    ])

Every 5 turns a summary table is printed.  Call latency_logger.log_summary()
at any point to print the table manually.
"""
import logging
import time
from dataclasses import dataclass
from typing import Optional

from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data class for one turn's measurements
# ---------------------------------------------------------------------------

@dataclass
class TurnLatency:
    """Latency measurements captured for a single conversation turn."""

    turn_number: int
    asr_ms: Optional[float] = None     # speech-start → transcript ready
    tts_ms: Optional[float] = None     # LLM-start    → first TTS audio chunk
    total_ms: Optional[float] = None   # speech-start → first TTS audio chunk


# ---------------------------------------------------------------------------
# Processor
# ---------------------------------------------------------------------------

class LatencyLoggerProcessor(FrameProcessor):
    """
    Passthrough processor — every frame is forwarded unchanged; we only
    observe timestamps on key frames to derive per-stage latency.

    Thread-safety: Pipecat runs the pipeline on a single asyncio event loop,
    so no explicit locking is needed.
    """

    def __init__(self):
        super().__init__()
        self._turns: list[TurnLatency] = []
        self._current_turn: Optional[TurnLatency] = None

        # Monotonic timestamps (seconds, from time.perf_counter)
        self._speech_start_ts: Optional[float] = None
        self._llm_start_ts: Optional[float] = None

        # Guards to ensure we only capture the *first* occurrence per turn
        self._asr_logged: bool = False
        self._first_audio_logged: bool = False

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    @property
    def turns(self) -> list[TurnLatency]:
        """Return a copy of all completed turn records."""
        return list(self._turns)

    @property
    def turn_count(self) -> int:
        return len(self._turns)

    def log_summary(self) -> None:
        """Print a formatted table of all recorded turns to the log."""
        if not self._turns:
            logger.info("[Latency] No completed turns recorded yet.")
            return

        logger.info("[Latency] ─────────────── Turn Latency Summary ───────────────")
        logger.info(f"  {'Turn':>5}  {'ASR ms':>8}  {'TTS ms':>8}  {'Total ms':>10}")
        logger.info("  " + "─" * 37)

        for t in self._turns:
            asr   = f"{t.asr_ms:.0f}"   if t.asr_ms   is not None else "  —"
            tts   = f"{t.tts_ms:.0f}"   if t.tts_ms   is not None else "  —"
            total = f"{t.total_ms:.0f}" if t.total_ms  is not None else "  —"
            logger.info(f"  {t.turn_number:>5}  {asr:>8}  {tts:>8}  {total:>10}")

        if self._turns:
            def _avg(vals):
                v = [x for x in vals if x is not None]
                return sum(v) / len(v) if v else None

            avg_asr   = _avg([t.asr_ms   for t in self._turns])
            avg_tts   = _avg([t.tts_ms   for t in self._turns])
            avg_total = _avg([t.total_ms for t in self._turns])

            asr_s   = f"{avg_asr:.0f}"   if avg_asr   is not None else "  —"
            tts_s   = f"{avg_tts:.0f}"   if avg_tts   is not None else "  —"
            total_s = f"{avg_total:.0f}" if avg_total  is not None else "  —"
            logger.info("  " + "─" * 37)
            logger.info(f"  {'AVG':>5}  {asr_s:>8}  {tts_s:>8}  {total_s:>10}")

        logger.info("[Latency] ─────────────────────────────────────────────────────")

    # -----------------------------------------------------------------------
    # Frame processing
    # -----------------------------------------------------------------------

    async def process_frame(self, frame, direction: FrameDirection):
        """
        Observe the frame, update internal timestamps, then forward unchanged.

        IMPORTANT: must call super().process_frame() first so that pipecat's
        base class sets _started=True when StartFrame arrives. Without this,
        pipecat logs "_check_started" errors for every frame.
        """
        # Let pipecat handle StartFrame / CancelFrame / InterruptionFrame etc.
        # This sets self._started = True and pushes system frames downstream.
        await super().process_frame(frame, direction)

        # Lazy frame-class imports to keep import-time side-effects minimal

        try:
            from pipecat.frames.frames import (
                AudioRawFrame,
                CancelFrame,
                LLMFullResponseStartFrame,
                StartFrame,
                StopFrame,
                TranscriptionFrame,
                TTSStoppedFrame,
                UserStartedSpeakingFrame,
                VADUserStartedSpeakingFrame,
            )
            # Build a tuple of audio frame classes we recognise.
            # Real TTS services push TTSAudioRawFrame (subclass of AudioRawFrame);
            # tests may push plain AudioRawFrame directly. Accept both.
            _audio_frame_classes: tuple = (AudioRawFrame,)
            try:
                from pipecat.frames.frames import TTSAudioRawFrame
                _audio_frame_classes = (AudioRawFrame, TTSAudioRawFrame)
            except ImportError:
                pass  # older pipecat — AudioRawFrame is sufficient

            # System frames are already forwarded by super() — skip them here.
            _system_frames = (StartFrame, StopFrame, CancelFrame)

        except ImportError:
            # Pipecat not installed — nothing more to do (super already pushed)
            return

        # System frames must still be forwarded downstream so downstream
        # processors receive StartFrame / CancelFrame / StopFrame.
        if isinstance(frame, _system_frames):
            await self.push_frame(frame, direction)
            return

        now = time.perf_counter()

        # ── User starts speaking → begin a new turn ──────────────────────────
        if isinstance(frame, (UserStartedSpeakingFrame, VADUserStartedSpeakingFrame)):
            turn_num = len(self._turns) + 1
            self._current_turn = TurnLatency(turn_number=turn_num)
            self._speech_start_ts = now
            self._llm_start_ts = None
            self._asr_logged = False
            self._first_audio_logged = False
            logger.info(f"[Latency] 🎙️  Turn #{turn_num} started")

        # ── First transcript frame → ASR done ────────────────────────────────
        elif isinstance(frame, TranscriptionFrame):
            if (
                self._speech_start_ts is not None
                and self._current_turn is not None
                and not self._asr_logged
                and frame.text.strip()          # ignore empty interim frames
            ):
                asr_ms = (now - self._speech_start_ts) * 1000
                self._current_turn.asr_ms = asr_ms
                self._asr_logged = True
                logger.info(
                    f"[Latency] 📝 ASR  {asr_ms:6.0f} ms  |  \"{frame.text}\""
                )

        # ── LLM starts responding → start TTS timer ──────────────────────────
        elif isinstance(frame, LLMFullResponseStartFrame):
            self._llm_start_ts = now

        # ── First audio frame out of TTS ──────────────────────────────────────
        elif isinstance(frame, _audio_frame_classes):
            if not self._first_audio_logged and self._current_turn is not None:
                if self._llm_start_ts is not None:
                    tts_ms = (now - self._llm_start_ts) * 1000
                    self._current_turn.tts_ms = tts_ms
                    logger.info(f"[Latency] 🔊 TTS first chunk  {tts_ms:6.0f} ms")

                if self._speech_start_ts is not None:
                    total_ms = (now - self._speech_start_ts) * 1000
                    self._current_turn.total_ms = total_ms
                    logger.info(f"[Latency] ⏱️  Total (speech→audio) {total_ms:6.0f} ms")

                self._first_audio_logged = True

        # ── TTS stopped → turn complete, store record ─────────────────────────
        elif isinstance(frame, TTSStoppedFrame):
            if self._current_turn is not None:
                if self._current_turn not in self._turns:
                    self._turns.append(self._current_turn)
                # Print summary every 5 completed turns
                if len(self._turns) % 5 == 0:
                    self.log_summary()

        # Always forward the frame unchanged (super() already forwarded system frames)
        await self.push_frame(frame, direction)

