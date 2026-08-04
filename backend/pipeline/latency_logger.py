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
# Processor & Shared State
# ---------------------------------------------------------------------------

class SharedLatencyState:
    def __init__(self, on_turn_complete=None):
        self.on_turn_complete = on_turn_complete
        self.turns: list[TurnLatency] = []
        self.current_turn: Optional[TurnLatency] = None

        self.speech_start_ts: Optional[float] = None
        self.llm_start_ts: Optional[float] = None

        self.asr_logged: bool = False
        self.first_audio_logged: bool = False

    def log_summary(self) -> None:
        if not self.turns:
            logger.info("[Latency] No completed turns recorded yet.")
            return

        logger.info("[Latency] ─────────────── Turn Latency Summary ───────────────")
        logger.info(f"  {'Turn':>5}  {'ASR ms':>8}  {'TTS ms':>8}  {'Total ms':>10}")
        logger.info("  " + "─" * 37)

        for t in self.turns:
            asr   = f"{t.asr_ms:.0f}"   if t.asr_ms   is not None else "  —"
            tts   = f"{t.tts_ms:.0f}"   if t.tts_ms   is not None else "  —"
            total = f"{t.total_ms:.0f}" if t.total_ms  is not None else "  —"
            logger.info(f"  {t.turn_number:>5}  {asr:>8}  {tts:>8}  {total:>10}")

        if self.turns:
            def _avg(vals):
                v = [x for x in vals if x is not None]
                return sum(v) / len(v) if v else None

            avg_asr   = _avg([t.asr_ms   for t in self.turns])
            avg_tts   = _avg([t.tts_ms   for t in self.turns])
            avg_total = _avg([t.total_ms for t in self.turns])

            asr_s   = f"{avg_asr:.0f}"   if avg_asr   is not None else "  —"
            tts_s   = f"{avg_tts:.0f}"   if avg_tts   is not None else "  —"
            total_s = f"{avg_total:.0f}" if avg_total  is not None else "  —"
            logger.info("  " + "─" * 37)
            logger.info(f"  {'AVG':>5}  {asr_s:>8}  {tts_s:>8}  {total_s:>10}")

        logger.info("[Latency] ─────────────────────────────────────────────────────")


class LatencyLoggerProcessor(FrameProcessor):
    """
    Passthrough processor. Multiple instances of this processor can be placed
    in the pipeline using the same SharedLatencyState to capture frames at different stages.
    """

    def __init__(self, shared_state: SharedLatencyState):
        super().__init__()
        self.shared = shared_state

    # -----------------------------------------------------------------------
    # Frame processing
    # -----------------------------------------------------------------------

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

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
            _audio_frame_classes: tuple = (AudioRawFrame,)
            try:
                from pipecat.frames.frames import TTSAudioRawFrame
                _audio_frame_classes = (AudioRawFrame, TTSAudioRawFrame)
            except ImportError:
                pass
            _system_frames = (StartFrame, StopFrame, CancelFrame)
        except ImportError:
            return

        if isinstance(frame, _system_frames):
            await self.push_frame(frame, direction)
            return

        now = time.perf_counter()

        if isinstance(frame, (UserStartedSpeakingFrame, VADUserStartedSpeakingFrame)):
            if self.shared.speech_start_ts is None or (now - self.shared.speech_start_ts > 1.0):
                turn_num = len(self.shared.turns) + 1
                self.shared.current_turn = TurnLatency(turn_number=turn_num)
                self.shared.speech_start_ts = now
                self.shared.llm_start_ts = None
                self.shared.asr_logged = False
                self.shared.first_audio_logged = False
                logger.info(f"[Latency] 🎙️  Turn #{turn_num} started")

        elif isinstance(frame, TranscriptionFrame):
            if (
                self.shared.speech_start_ts is not None
                and self.shared.current_turn is not None
                and not self.shared.asr_logged
                and frame.text.strip()
            ):
                asr_ms = (now - self.shared.speech_start_ts) * 1000
                self.shared.current_turn.asr_ms = asr_ms
                self.shared.asr_logged = True
                logger.info(f"[Latency] 📝 ASR  {asr_ms:6.0f} ms  |  \"{frame.text}\"")

        elif isinstance(frame, LLMFullResponseStartFrame):
            self.shared.llm_start_ts = now

        elif isinstance(frame, _audio_frame_classes):
            if not self.shared.first_audio_logged and self.shared.current_turn is not None:
                if self.shared.llm_start_ts is not None:
                    tts_ms = (now - self.shared.llm_start_ts) * 1000
                    self.shared.current_turn.tts_ms = tts_ms
                    logger.info(f"[Latency] 🔊 TTS first chunk  {tts_ms:6.0f} ms")

                    if self.shared.speech_start_ts is not None:
                        total_ms = (now - self.shared.speech_start_ts) * 1000
                        self.shared.current_turn.total_ms = total_ms
                        logger.info(f"[Latency] ⏱️  Total (speech→audio) {total_ms:6.0f} ms")

                    self.shared.first_audio_logged = True

        elif isinstance(frame, TTSStoppedFrame):
            if self.shared.current_turn is not None:
                if self.shared.current_turn not in self.shared.turns:
                    self.shared.turns.append(self.shared.current_turn)
                    if self.shared.on_turn_complete:
                        import asyncio
                        asyncio.create_task(self.shared.on_turn_complete(self.shared.current_turn))
                if len(self.shared.turns) % 5 == 0:
                    self.shared.log_summary()
                
                # Reset speech_start_ts to allow next turn to correctly trigger
                self.shared.speech_start_ts = None

        await self.push_frame(frame, direction)

