import { useCallback, useEffect, useRef } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client';
import { useAppStore } from '../../../store/useAppStore';
import { useSessionStore } from '../../../store/useSessionStore';
import { getToken } from '../api/voiceApi';
import { toasts } from '../../../lib/toast';
import type { DCPayload, TranscriptMessage } from '../../../types/agent';

const WARMUP_TIMEOUT_MS = 10_000;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface UseVoiceAgentOptions {
  roomName?: string;
  onAudioTrack?: (track: RemoteTrack) => void;
}

export function useVoiceAgent({
  roomName = 'voice-room',
  onAudioTrack,
}: UseVoiceAgentOptions = {}) {
  const user = useAppStore((s) => s.user);
  const {
    agentState,
    speakingState,
    isMuted,
    isVolumeOff,
    setAgentState,
    setSpeakingState,
    setIsMuted,
    setIsVolumeOff,
    setError,
    incrementDuration,
    resetDuration,
    addTranscript,
    updateTypingTranscript,
    addToolEvent,
  } = useSessionStore();

  const roomRef = useRef<Room | null>(null);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectToastIdRef = useRef<string | number | null>(null);

  // ── Cleanup helpers ──────────────────────────────────────────────────────────
  const clearWarmupTimer = useCallback(() => {
    if (warmupTimerRef.current) {
      clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    durationTimerRef.current = setInterval(() => {
      incrementDuration();
    }, 1000);
  }, [incrementDuration]);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    resetDuration();
  }, [resetDuration]);

  // ── Connect ──────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!user) return;

    toasts.dismiss(); // Clear any persisting error toasts

    setAgentState('CONNECTING');
    setError(null);

    try {
      // Check mic permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: unknown) {
        const domErr = err as DOMException;
        if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
          toasts.micDenied();
          setAgentState('ERROR');
          setError('Microphone access required.');
          return;
        } else if (domErr.name === 'NotFoundError') {
          toasts.micNotFound();
          setAgentState('ERROR');
          setError('No microphone detected.');
          return;
        }
        // other errors fall through — LiveKit will handle them
      }

      // Get LiveKit token
      const participantName = user.name || user.email || 'user';
      const { token, livekit_url } = await getToken(roomName, participantName);

      // Create room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // ── Room event handlers ────────────────────────────────────────────────
      room.on(RoomEvent.Connected, () => {
        setAgentState('WARMING_UP');

        // 10s warmup timeout
        warmupTimerRef.current = setTimeout(() => {
          toasts.agentTimeout();
          setAgentState('ERROR');
          setError('Agent took too long to respond. Please retry.');
          room.disconnect();
        }, WARMUP_TIMEOUT_MS);
      });

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          _participant: RemoteParticipant
        ) => {
          if (track.kind === Track.Kind.Audio) {
            clearWarmupTimer();
            setAgentState('CONNECTED');
            setSpeakingState('QUIET');
            startDurationTimer();
            toasts.connected();
            onAudioTrack?.(track);
            
            // Attach the track to a new audio element and append it to the DOM to play sound
            const element = track.attach();
            document.body.appendChild(element);
          }
        }
      );

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text) as DCPayload;

          if (data.type === 'transcript') {
            if (data.role === 'user') {
              // Barge-in: snap from SPEAKING → LISTENING immediately
              setSpeakingState('LISTENING');

              const msg: TranscriptMessage = {
                id: generateId(),
                role: 'user',
                text: data.text,
                timestamp: data.timestamp || new Date().toISOString(),
              };
              addTranscript(msg);
            } else if (data.role === 'agent') {
              setSpeakingState('SPEAKING');

              // Look for existing typing bubble and update it, else create new
              const existingTyping = useSessionStore
                .getState()
                .transcripts.find((t) => t.role === 'agent' && t.isTyping);

              if (existingTyping) {
                updateTypingTranscript(existingTyping.id, data.text, true);
              } else {
                const msg: TranscriptMessage = {
                  id: generateId(),
                  role: 'agent',
                  text: data.text,
                  timestamp: data.timestamp || new Date().toISOString(),
                  isTyping: false,
                };
                addTranscript(msg);
              }
            }
          } else if (data.type === 'tool_event') {
            addToolEvent({
              id: generateId(),
              name: data.name,
              status: data.status,
              output_preview: data.output_preview,
              timestamp: data.timestamp,
              turn: data.turn,
            });
            toasts.toolUsed(data.name);
          }
        } catch {
          // Non-JSON payload — ignore
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          setSpeakingState('QUIET');
          // Detach and remove audio elements
          track.detach().forEach((el) => el.remove());
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        clearWarmupTimer();
        stopDurationTimer();

        const prevState = useSessionStore.getState().agentState;
        if (prevState === 'CONNECTED' || prevState === 'WARMING_UP') {
          if (room.state === ConnectionState.Disconnected) {
            // Check if it was user-initiated (handled in disconnect()) or unexpected
            const currentState = useSessionStore.getState().agentState;
            if (currentState !== 'IDLE') {
              toasts.connectionLost();
              setAgentState('ERROR');
              setError('Connection lost. Please reconnect.');
            }
          }
        }
      });

      room.on(RoomEvent.Reconnecting, () => {
        const id = toasts.reconnecting();
        if (id) reconnectToastIdRef.current = id;
        setAgentState('CONNECTING');
      });

      room.on(RoomEvent.Reconnected, () => {
        if (reconnectToastIdRef.current) {
          toasts.dismiss(reconnectToastIdRef.current);
          reconnectToastIdRef.current = null;
        }
        toasts.reconnected();
        setAgentState('CONNECTED');
      });

      // Connect to room
      await room.connect(livekit_url, token);

      // Enable local mic (always on — barge-in is always active)
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err: unknown) {
      clearWarmupTimer();
      stopDurationTimer();
      const msg =
        err instanceof Error ? err.message : 'Failed to connect to the voice room.';
      toasts.tokenError(msg);
      setAgentState('ERROR');
      setError(msg);
    }
  }, [
    user,
    roomName,
    setAgentState,
    setSpeakingState,
    setError,
    addTranscript,
    updateTypingTranscript,
    addToolEvent,
    onAudioTrack,
    clearWarmupTimer,
    startDurationTimer,
    stopDurationTimer,
  ]);

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    clearWarmupTimer();
    stopDurationTimer();

    toasts.dismiss(); // Clear any persisting error toasts

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setAgentState('IDLE');
    setSpeakingState('QUIET');
    setError(null);
    toasts.disconnected();
  }, [clearWarmupTimer, stopDurationTimer, setAgentState, setSpeakingState, setError]);

  // ── Mute toggle ──────────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const newMuted = !isMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
    } catch {
      // ignore
    }
  }, [isMuted, setIsMuted]);

  // ── Volume toggle ─────────────────────────────────────────────────────────────
  const toggleVolume = useCallback(() => {
    setIsVolumeOff(!isVolumeOff);
  }, [isVolumeOff, setIsVolumeOff]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearWarmupTimer();
      stopDurationTimer();
      // Set to IDLE to prevent the Disconnected event from thinking it was an error
      setAgentState('IDLE');
      roomRef.current?.disconnect();
      toasts.dismiss();
    };
  }, [clearWarmupTimer, stopDurationTimer, setAgentState]);

  return {
    room: roomRef.current,
    agentState,
    speakingState,
    connect,
    disconnect,
    toggleMute,
    toggleVolume,
  };
}
