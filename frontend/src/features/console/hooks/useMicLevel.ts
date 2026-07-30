import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIC_THRESHOLD    = 0.08;   // 0-1 amplitude to count as "speaking"
const ONSET_HOLDOFF_MS = 150;    // must exceed threshold for 150ms before "speaking" triggers
const SILENCE_HOLD_MS  = 600;    // must be below threshold for 600ms before "silent" triggers

interface MicLevelData {
  isSpeaking: boolean; // true while user is audibly speaking (with hysteresis)
  amplitude: number;   // raw 0-1 amplitude of mic signal (60fps)
  bars: number[];      // per-bar 0-1 amplitude, length = barCount (60fps)
}

/**
 * useMicLevel
 * -----------
 * Captures the user's microphone via getUserMedia and runs a Web Audio AnalyserNode
 * to produce real-time amplitude data for the graphic equalizer.
 *
 * Key features:
 *  - `isSpeaking` uses double-sided hysteresis (onset + silence holdoff) so
 *    the pipeline stage indicator doesn't flicker on breath/background noise.
 *  - Only activated when `active` is true (i.e. agent is connected).
 *  - Stops and releases mic on cleanup.
 */
export function useMicLevel(active: boolean, barCount = 32): MicLevelData {
  const [data, setData] = useState<MicLevelData>({
    isSpeaking: false,
    amplitude:  0,
    bars:       Array(barCount).fill(0),
  });

  const streamRef  = useRef<MediaStream | null>(null);
  const ctxRef     = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef     = useRef<number | null>(null);

  // Hysteresis state (stored in refs so the rAF loop can read them without stale closures)
  const isSpeakingRef   = useRef(false);
  const onsetTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current)      { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (onsetTimerRef.current)   { clearTimeout(onsetTimerRef.current);   onsetTimerRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (ctxRef.current)      { ctxRef.current.close(); ctxRef.current = null; }
    if (streamRef.current)   { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
    isSpeakingRef.current = false;
    setData({ isSpeaking: false, amplitude: 0, bars: Array(barCount).fill(0) });
  }, [barCount]);

  useEffect(() => {
    if (!active) { cleanup(); return; }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
          video: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const ctx      = new AudioContext();
        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize              = 256;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        ctxRef.current     = ctx;
        analyserRef.current = analyser;

        const bufferLen = analyser.frequencyBinCount;   // 128
        const dataArr   = new Uint8Array(bufferLen);
        const step      = Math.floor(bufferLen / barCount);

        const tick = () => {
          if (!analyserRef.current || cancelled) return;
          analyserRef.current.getByteFrequencyData(dataArr);

          // Overall amplitude (mean across all frequency bins)
          let sum = 0;
          for (let i = 0; i < bufferLen; i++) sum += dataArr[i];
          const amplitude = sum / bufferLen / 255;

          // Per-bar amplitudes (chunk frequency bins evenly)
          const bars = Array.from({ length: barCount }, (_, i) => {
            const s = i * step;
            let bSum = 0;
            for (let j = s; j < s + step; j++) bSum += dataArr[j];
            return bSum / step / 255;
          });

          // ── Hysteresis: onset detection ───────────────────────────────────
          if (amplitude > MIC_THRESHOLD) {
            // Clear any pending silence timer (user kept speaking)
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
            // Start onset holdoff if not already speaking
            if (!isSpeakingRef.current && !onsetTimerRef.current) {
              onsetTimerRef.current = setTimeout(() => {
                onsetTimerRef.current = null;
                isSpeakingRef.current = true;
              }, ONSET_HOLDOFF_MS);
            }
          } else {
            // Clear onset timer (signal dropped below threshold too fast — noise)
            if (onsetTimerRef.current) { clearTimeout(onsetTimerRef.current); onsetTimerRef.current = null; }
            // Start silence holdoff before declaring user has stopped speaking
            if (isSpeakingRef.current && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                isSpeakingRef.current = false;
              }, SILENCE_HOLD_MS);
            }
          }

          setData({ isSpeaking: isSpeakingRef.current, amplitude, bars });
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Mic unavailable / permission denied — fail silently (LiveKit would have already caught this)
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, barCount, cleanup]);

  return data;
}
