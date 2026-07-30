import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../../store/useSessionStore';
import type { AgentState, PipelineStage } from '../../../types/agent';

/**
 * usePipelineStage
 * ----------------
 * Drives the explicit `pipelineStage` state machine in the session store based
 * on real audio signals — NOT DataChannel message timing.
 *
 * State transitions:
 *   QUIET  ──mic speaks──►  ASR_ACTIVE
 *   ASR_ACTIVE  ──mic silence──►  LLM_ACTIVE
 *   LLM_ACTIVE  ──agent audio──►  TTS_ACTIVE
 *   TTS_ACTIVE  ──agent silence──►  QUIET
 *   * → IDLE when agentState !== 'CONNECTED'
 *
 * Uses `micIsSpeaking` and `agentIsSpeaking` booleans (with hysteresis already
 * applied in useMicLevel / useWaveform) so effects only fire on state changes,
 * not on every animation frame.
 */
export function usePipelineStage({
  micIsSpeaking,
  agentIsSpeaking,
  agentState,
}: {
  micIsSpeaking: boolean;
  agentIsSpeaking: boolean;
  agentState: AgentState;
}) {
  const { pipelineStage, setPipelineStage } = useSessionStore();

  // Keep a ref that's always in sync so effects can read current stage
  // without creating stale closures or adding it to their dep arrays.
  const stageRef = useRef<PipelineStage>(pipelineStage);
  stageRef.current = pipelineStage;

  // Helper: update ref + store atomically so subsequent effects in the same
  // flush see the updated value.
  const setStage = (stage: PipelineStage) => {
    stageRef.current = stage;
    setPipelineStage(stage);
  };

  // ── Effect 1: not connected → reset ────────────────────────────────────────
  useEffect(() => {
    if (agentState !== 'CONNECTED') {
      setStage('IDLE');
    } else if (stageRef.current === 'IDLE') {
      // Just became connected — start in QUIET
      setStage('QUIET');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentState]);

  // ── Effect 2: mic activity → ASR  ──────────────────────────────────────────
  useEffect(() => {
    if (agentState !== 'CONNECTED') return;

    if (micIsSpeaking) {
      // User started speaking → ASR is actively receiving audio
      if (stageRef.current === 'QUIET' || stageRef.current === 'TTS_ACTIVE') {
        setStage('ASR_ACTIVE');
      }
    } else {
      // User stopped speaking → go to QUIET. 
      // We wait for the backend's DataChannel transcript to explicitly trigger LLM_ACTIVE,
      // which prevents random noises from getting stuck in a "Thinking" state.
      if (stageRef.current === 'ASR_ACTIVE') {
        setStage('QUIET');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micIsSpeaking, agentState]);

  // ── Effect 3: agent audio → TTS / QUIET ────────────────────────────────────
  useEffect(() => {
    if (agentState !== 'CONNECTED') return;

    if (agentIsSpeaking) {
      // Agent audio has started → TTS is rendering
      if (stageRef.current !== 'TTS_ACTIVE') {
        setStage('TTS_ACTIVE');
      }
    } else {
      // Agent audio stopped → ready for next turn
      if (stageRef.current === 'TTS_ACTIVE') {
        setStage('QUIET');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentIsSpeaking, agentState]);
}
