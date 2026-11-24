<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useCamera at d422a73. -->

> `@lacuna/use-camera` `0.1.0`. To use it in an app: add `"@lacuna/use-camera": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-camera": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-camera'`.

# useCamera

A React hook that manages a live camera stream: start/stop the stream, list and
select input devices, and capture a single frame to a canvas.

## Usage

```tsx
import { useCamera } from '@lacuna/use-camera';

function CameraPreview() {
  const { stream, error, isReady, start, stop, captureFrame, devices, selectDevice } = useCamera();
  return (
    <div>
      <video ref={(el) => { if (el && stream) el.srcObject = stream; }} autoPlay muted playsInline />
      {error && <p>{error}</p>}
      <button onClick={() => void start()}>{isReady ? 'Stop' : 'Start'}</button>
      <button onClick={stop}>Stop</button>
      <select onChange={(e) => selectDevice(e.target.value)}>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
        ))}
      </select>
    </div>
  );
}
```

## What it is

`useCamera` wraps `navigator.mediaDevices` so the rest of the app never touches
`getUserMedia` directly. It owns the `MediaStream`'s lifecycle (tracks are
stopped when the hook unmounts or `stop()` is called), degrades gracefully when
the API is missing, and keeps callbacks stable across re-renders.

## API

```tsx
import { useCamera } from '@lacuna/use-camera';

const {
  stream,      // MediaStream | null — live stream once started
  error,       // string | null — last failure message
  isReady,     // boolean — true while a stream is active
  start,       // () => Promise<void> — request the camera (idempotent)
  stop,        // () => void — end the stream
  captureFrame // (canvas: HTMLCanvasElement) => void — draw one frame
} = useCamera({ deviceId: 'front-cam' });
```

### Options

| Option       | Type                                    | Default | Notes                                  |
| ------------ | --------------------------------------- | ------- | -------------------------------------- |
| `deviceId`   | `string`                                | `null`  | Exact device id for the first `start()`. |
| `width`      | `number`                                | `1280`  | Preferred capture width (advisory).     |
| `height`     | `number`                                | `720`   | Preferred capture height (advisory).    |
| `facingMode` | `'user' \| 'environment'`               | `user`  | Preferred camera on multi-camera devices. |

### Return value

| Member         | Type                  | Meaning                                    |
| -------------- | --------------------- | ------------------------------------------ |
| `stream`       | `MediaStream \| null` | The active stream, or `null` when stopped. |
| `error`        | `string \| null`      | Message from the last failed `start()`.    |
| `isReady`      | `boolean`             | `true` while a stream is held.             |
| `start`        | `() => Promise<void>` | Requests the camera; safe to call again.   |
| `stop`         | `() => void`          | Stops all tracks and clears state.         |
| `captureFrame` | `(canvas) => void`    | Draws the current frame to a canvas.       |
| `devices`      | `MediaDeviceInfo[]`   | Available video input devices.             |
| `selectDevice` | `(id: string) => void`| Chooses the device for the next `start()`. |

## Behavior

- **Initial state** — `stream` is `null`, `error` is `null`, `isReady` is `false`.
- **`start()`** — calls `getUserMedia` with the selected device (or `{ video: true }`).
  Resolving it sets `isReady` and exposes the stream; rejecting it records `error`.
  Calling it while a stream is active is a no-op.
- **`stop()`** — stops every track, clears `stream`, and sets `isReady` to `false`.
- **`captureFrame(canvas)`** — no-op unless ready; otherwise draws the current
  frame to the given canvas at the stream's natural dimensions.
- **`selectDevice(id)`** — remembers the id; the next `start()` requests it
  exactly via `deviceId: { exact: id }`.
- **Unavailable API** — when `navigator.mediaDevices` is missing, `start()`
  records `Camera is not available` and leaves `isReady` `false`.
- **Cleanup** — unmounting stops any live tracks automatically.

## Demo

`demo/Demo.tsx` wires the hook to a `<video>` preview, start/stop/capture
buttons, and a device picker. The page renders in every theme combination the
design system defines.

## Constraints

- Runs in any modern browser; degrades to an error state (not a crash) when
  `MediaDevices` is absent or permission is denied.
- No network access, no globals other than `navigator.mediaDevices`.
- The canvas used with `captureFrame` is caller-owned; the hook only draws to it.
