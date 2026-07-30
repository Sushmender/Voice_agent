import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteTrack } from 'livekit-client';

interface WaveformData {
  amplitude: number; // 0-1 overall amplitude
  bars: number[];    // per-bar values 0-1, length = barCount
  isSpeaking: boolean; // true while agent audio exceeds threshold (with hysteresis)
}

interface UseWaveformOptions {
  barCount?: number;
  smoothing?: number; // AnalyserNode smoothingTimeConstant (0-1)
}

export function useWaveform(
  audioTrack: RemoteTrack | null | undefined,
  { barCount = 7, smoothing = 0.8 }: UseWaveformOptions = {}
) {
  const [data, setData] = useState<WaveformData>({
    amplitude: 0,
    bars: Array(barCount).fill(0),
    isSpeaking: false,
  });

  const analyserRef  = useRef<AnalyserNode | null>(null);
  const sourceRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const contextRef   = useRef<AudioContext | null>(null);
  const rafRef       = useRef<number | null>(null);
  const phaseRef     = useRef(0); // for synthetic fallback

  // Hysteresis for agent speaking detection
  const AGENT_THRESHOLD   = 0.025;
  const AGENT_SILENCE_MS  = 400;
  const isSpeakingRef     = useRef(false);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Synthetic fallback waveform ────────────────────────────────────────────
  const startSynthetic = useCallback(() => {
    const animate = () => {
      phaseRef.current += 0.05;
      const bars = Array.from({ length: barCount }, (_, i) => {
        const offset = (i / barCount) * Math.PI * 2;
        return 0.4 + 0.4 * Math.sin(phaseRef.current + offset);
      });
      setData({ amplitude: 0.5, bars, isSpeaking: true });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [barCount]);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ── Real Web Audio API waveform ────────────────────────────────────────────
  const startReal = useCallback(
    (track: RemoteTrack) => {
      try {
        const mediaStream = new MediaStream([track.mediaStreamTrack]);
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = smoothing;
        source.connect(analyser);

        contextRef.current = ctx;
        sourceRef.current = source;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const animate = () => {
          analyser.getByteFrequencyData(dataArray);

          // Overall amplitude: average of all bins
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const amplitude = sum / bufferLength / 255;

          // Per-bar: divide frequency bins evenly
          const step = Math.floor(bufferLength / barCount);
          const bars = Array.from({ length: barCount }, (_, i) => {
            const start = i * step;
            let binSum = 0;
            for (let j = start; j < start + step; j++) {
              binSum += dataArray[j];
            }
            return (binSum / step / 255);
          });

          // ── Agent speaking detection (hysteresis) ───────────────────────
          if (amplitude > AGENT_THRESHOLD) {
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
            isSpeakingRef.current = true;
          } else if (isSpeakingRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              isSpeakingRef.current = false;
            }, AGENT_SILENCE_MS);
          }

          setData({ amplitude, bars, isSpeaking: isSpeakingRef.current });
          rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
      } catch {
        // Web Audio not available — use synthetic
        startSynthetic();
      }
    },
    [barCount, smoothing, startSynthetic]
  );

  const cleanup = useCallback(() => {
    stopAnimation();
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }
    analyserRef.current = null;
    isSpeakingRef.current = false;
    setData({ amplitude: 0, bars: Array(barCount).fill(0), isSpeaking: false });
  }, [stopAnimation, barCount]);

  useEffect(() => {
    if (!audioTrack) {
      cleanup();
      return;
    }

    if (audioTrack.mediaStreamTrack) {
      startReal(audioTrack);
    } else {
      startSynthetic();
    }

    return cleanup;
  }, [audioTrack, startReal, startSynthetic, cleanup]);

  return data;
}
