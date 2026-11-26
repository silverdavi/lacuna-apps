// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-media-recorder 0.1.0: snapshot of lacuna-components useMediaRecorder at d422a73 by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';

export type MediaSource = 'audio' | 'video' | 'screen';

export interface UseMediaRecorderOptions {
  /** Media source to record. Defaults to 'audio'. */
  source?: MediaSource;
  /** MIME type for the recorded blob. Defaults to 'audio/webm' for audio, 'video/webm' for video/screen. */
  mimeType?: string;
  /** Interval in ms for elapsed-time updates. Defaults to 1000. */
  tickIntervalMs?: number;
}

export type UseMediaRecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

export interface UseMediaRecorderReturn {
  /** Current recording state. */
  status: UseMediaRecorderStatus;
  /** Elapsed recording time in seconds (resets on each new recording). */
  elapsed: number;
  /** The recorded Blob, or null if not yet recorded. */
  blob: Blob | null;
  /** Error message if status is 'error', otherwise null. */
  error: string | null;
  /** Start (or resume) recording. */
  start: () => Promise<void>;
  /** Pause recording. */
  pause: () => void;
  /** Resume a paused recording. */
  resume: () => void;
  /** Stop recording and finalise the blob. */
  stop: () => void;
  /** Reset state back to idle and clear the blob. */
  reset: () => void;
}

interface RecorderLike {
  state: 'inactive' | 'recording' | 'paused';
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
}

function defaultMimeType(source: MediaSource): string {
  return source === 'audio' ? 'audio/webm' : 'video/webm';
}

export function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [status, setStatus] = useState<UseMediaRecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const statusRef = useRef(status);
  const recorderRef = useRef<RecorderLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickIdRef = useRef<number | null>(null);

  const setStatusAndRef = useCallback((next: UseMediaRecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      if (statusRef.current === 'requesting' || statusRef.current === 'recording' || statusRef.current === 'paused') {
        setStatusAndRef('stopped');
      }
      return;
    }
    recorder.stop();
    const recorded = chunksRef.current;
    if (recorded.length > 0) {
      const opts = optionsRef.current;
      const mime = opts?.mimeType ?? defaultMimeType(opts?.source ?? 'audio');
      setBlob(new Blob(recorded, { type: mime }));
    }
    recorderRef.current = null;
    setStatusAndRef('stopped');
  }, [setStatusAndRef]);

  const start = useCallback(async () => {
    const current = statusRef.current;
    if (current === 'recording' || current === 'requesting') return;
    if (current === 'paused') {
      recorderRef.current?.resume();
      setStatusAndRef('recording');
      return;
    }
    if (current !== 'idle' && current !== 'error' && current !== 'stopped') return;

    const opts = optionsRef.current;
    const source = opts?.source ?? 'audio';
    const tick = opts?.tickIntervalMs ?? 1000;
    const mime = opts?.mimeType ?? defaultMimeType(source);

    chunksRef.current = [];
    setBlob(null);
    setError(null);
    setElapsed(0);
    setStatusAndRef('requesting');

    let stream: MediaStream;
    try {
      const md = navigator.mediaDevices;
      if (source === 'screen') {
        const getDisplay = md.getDisplayMedia;
        stream = typeof getDisplay === 'function' ? await getDisplay() : await (getDisplay as unknown as Promise<MediaStream>);
      } else {
        const getStream = md.getUserMedia;
        stream = typeof getStream === 'function'
          ? await getStream({ audio: source === 'audio', video: source === 'video' })
          : await (getStream as unknown as Promise<MediaStream>);
      }
    } catch (err) {
      setStatusAndRef('error');
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    if (statusRef.current === 'idle') {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    let recorder: RecorderLike;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime }) as unknown as RecorderLike;
    } catch (err) {
      stream.getTracks().forEach((track) => track.stop());
      setStatusAndRef('error');
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    recorder.ondataavailable = (event) => {
      if (event.data) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatusAndRef('recording');

    tickIdRef.current = window.setInterval(() => {
      if (statusRef.current === 'recording') setElapsed((e) => e + 1);
    }, tick);
  }, [setStatusAndRef]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'recording') return;
    recorderRef.current?.pause();
    setStatusAndRef('paused');
  }, [setStatusAndRef]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    recorderRef.current?.resume();
    setStatusAndRef('recording');
  }, [setStatusAndRef]);

  const clearTick = useCallback(() => {
    if (tickIdRef.current !== null) {
      window.clearInterval(tickIdRef.current);
      tickIdRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    clearTick();
    setStatusAndRef('idle');
    setBlob(null);
    setElapsed(0);
    setError(null);
  }, [clearTick, setStatusAndRef]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      recorderRef.current = null;
      clearTick();
    };
  }, [clearTick]);

  return { status, elapsed, blob, error, start, pause, resume, stop, reset };
}
