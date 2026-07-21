import { useRef, useCallback } from 'react';
import { useSessionStore } from '../../../store/useSessionStore';
import type { LatencyEntry } from '../../../types/agent';

/**
 * useLatency — tracks per-turn latency.
 *
 * Call startTurn() when a user transcript arrives.
 * Call endTurn() when the agent transcript arrives.
 * The hook writes LatencyEntry records to the session store.
 */
export function useLatency() {
  const turnStartRef = useRef<number | null>(null);
  const ttfbRef = useRef<number | null>(null);
  const turnCountRef = useRef(0);

  const addLatencyEntry = useSessionStore((s) => s.addLatencyEntry);

  const startTurn = useCallback(() => {
    turnStartRef.current = performance.now();
    ttfbRef.current = null;
  }, []);

  const markFirstByte = useCallback(() => {
    if (turnStartRef.current !== null && ttfbRef.current === null) {
      ttfbRef.current = performance.now() - turnStartRef.current;
    }
  }, []);

  const endTurn = useCallback(() => {
    if (turnStartRef.current === null) return;
    const total = performance.now() - turnStartRef.current;
    const ttfb = ttfbRef.current ?? total;
    turnCountRef.current += 1;

    const entry: LatencyEntry = {
      turn: turnCountRef.current,
      ttfb: Math.round(ttfb),
      total: Math.round(total),
      timestamp: new Date().toISOString(),
    };
    addLatencyEntry(entry);

    turnStartRef.current = null;
    ttfbRef.current = null;
  }, [addLatencyEntry]);

  const reset = useCallback(() => {
    turnStartRef.current = null;
    ttfbRef.current = null;
    turnCountRef.current = 0;
  }, []);

  return { startTurn, markFirstByte, endTurn, reset };
}
