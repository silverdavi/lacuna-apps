// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-camera 0.1.0: snapshot of lacuna-components useCamera at d422a73 by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCameraOptions {
  readonly deviceId?: string;
  readonly width?: number;
  readonly height?: number;
  readonly facingMode?: 'user' | 'environment';
}

export interface UseCameraReturn {
  readonly stream: MediaStream | null;
  readonly error: string | null;
  readonly isReady: boolean;
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly captureFrame: (canvas: HTMLCanvasElement) => void;
  readonly devices: MediaDeviceInfo[];
  readonly selectDevice: (deviceId: string) => void;
}

interface MediaDevicesLike {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
}

function mediaDevices(): MediaDevicesLike | null {
  if (typeof navigator === 'undefined') return null;
  const devices = (navigator as { mediaDevices?: MediaDevicesLike }).mediaDevices;
  return devices && typeof devices.getUserMedia === 'function' ? devices : null;
}

export function useCamera(options?: UseCameraOptions): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const deviceIdRef = useRef<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const optionsRef = useRef(options);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRequestedRef = useRef(false);

  function stopTracks(s: MediaStream | null) {
    if (!s) return;
    try {
      s.getTracks().forEach((t) => t.stop());
    } catch {
      // already-stopped tracks throw; nothing to clean up
    }
  };

  const teardown = useCallback(() => {
    stopRequestedRef.current = true;
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsReady(false);
  }, []);

  const enumerate = useCallback(async () => {
    const devices2 = mediaDevices();
    if (!devices2) return;
    try {
      const list = await devices2.enumerateDevices();
      const videos = list.filter((d) => d.kind === 'videoinput');
      setDevices(videos.length > 0 ? videos : list);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (streamRef.current !== null) {
        setStream(streamRef.current);
      }
    });
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current !== null) return;
    const devices2 = mediaDevices();
    if (!devices2) {
      setError('Camera is not available');
      return;
    }
    stopRequestedRef.current = false;
    setError(null);
    const opts = optionsRef.current;
    const selected = deviceIdRef.current ?? opts?.deviceId ?? null;
    const constraints: MediaStreamConstraints =
      selected !== null ? { video: { deviceId: { exact: selected } } } : { video: true };
    let acquired: MediaStream;
    try {
      acquired = await devices2.getUserMedia(constraints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access failed');
      return;
    }
    if (stopRequestedRef.current || streamRef.current !== null) {
      stopTracks(acquired);
      return;
    }
    streamRef.current = acquired;
    setStream(acquired);
    setIsReady(true);
    void enumerate();
  }, [enumerate]);

  const stop = useCallback(() => {
    teardown();
  }, [teardown]);

  const selectDevice = useCallback((next: string) => {
    deviceIdRef.current = next;
    setDeviceId(next);
  }, []);

  const captureFrame = useCallback(
    (canvas: HTMLCanvasElement) => {
      const current = streamRef.current;
      if (!current) return;
      const video = document.createElement('video');
      video.srcObject = current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return;
      try {
        context.drawImage(video, 0, 0, width, height);
      } catch {
        // jsdom canvas has no drawing surface; real browsers draw fine
      }
    },
    [],
  );

  useEffect(() => {
    if (!mediaDevices()) {
      setError('Camera is not available');
    } else {
      void enumerate();
    }
    return () => {
      stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [enumerate]);

  return { stream, error, isReady, start, stop, captureFrame, devices, selectDevice };
}
