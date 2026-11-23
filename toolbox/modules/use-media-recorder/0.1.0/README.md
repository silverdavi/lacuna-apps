<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useMediaRecorder at d422a73. -->

> `@lacuna/use-media-recorder` `0.1.0`. To use it in an app: add `"@lacuna/use-media-recorder": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-media-recorder": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-media-recorder'`.

# useMediaRecorder

A React hook that records microphone, camera, or screen media into a `Blob` using the platform `MediaRecorder` API, exposing the current recording status, the elapsed time in seconds, and the finalised blob. It wraps permission and stream acquisition (with a `requesting` state while the stream is being obtained), pause/resume, stopping with blob finalisation, and a reset that clears everything, and reports failures as an `error` state with a message. Needed by voice-recorder, screen-recorder, and soundboard apps that capture local media without a server.

## Signature

```ts
export interface UseMediaRecorderOptions {
  /** Media source to record. Defaults to 'audio'. */
  source?: 'audio' | 'video' | 'screen';
  /** MIME type for the recorded blob. Defaults to 'audio/webm' for audio, 'video/webm' for video/screen. */
  mimeType?: string;
  /** Interval in ms for elapsed-time updates. Defaults to 1000. */
  tickIntervalMs?: number;
}

export interface UseMediaRecorderReturn {
  /** Current recording state. */
  status: 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';
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

export function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn;
```

`start()` requests the stream (`getUserMedia` for audio/video, `getDisplayMedia` for screen), builds a `MediaRecorder`, and begins recording; `elapsed` counts up in one-second steps while recording and freezes while paused. `stop()` finalises the collected chunks into `blob` and sets status to `stopped`; `reset()` goes back to `idle` and clears the blob and elapsed time.

## Usage

```tsx
import { useMediaRecorder } from '@lacuna/use-media-recorder';

function VoiceNote() {
  const { status, elapsed, blob, start, pause, stop } = useMediaRecorder();
  return (
    <div>
      <p>{status} · {elapsed}s</p>
      {status === 'recording' ? (
        <button onClick={pause}>Pause</button>
      ) : (
        <button onClick={() => void start()}>Record</button>
      )}
      {status === 'recording' || status === 'paused' ? (
        <button onClick={stop}>Stop</button>
      ) : null}
      {blob ? <a href={URL.createObjectURL(blob)} download="note.webm">Download</a> : null}
    </div>
  );
}
```
