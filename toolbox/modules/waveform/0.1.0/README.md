<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Waveform at c16104e. -->

> `@lacuna/waveform` `0.1.0`. To use it in an app: add `"@lacuna/waveform": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/waveform": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/waveform'`.

# Waveform

Renders a static audio waveform with a draggable playhead and optional trim handles, so users can scrub through audio and mark in/out points. It is a controlled component: the playhead is driven by `position` and reported through `onPositionChange`, and trim handles (when `trim` is provided) are driven by `trim` and reported through `onTrimChange`. One key step is `duration / 100` seconds; pointer drags on the region scrub the playhead and drag the trim handles within their valid ranges.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `peaks` | `number[]` | — | Amplitude values, each 0-1, rendered as bars. |
| `duration` | `number` | — | Total audio duration in seconds. |
| `position` | `number` | — | Current playhead position in seconds. |
| `onPositionChange` | `(position: number) => void` | — | Called when the user scrubs or keys the playhead. |
| `trim` | `{ start: number; end: number }` | — | When set, renders trim start/end handles at these seconds. |
| `onTrimChange` | `(trim: { start: number; end: number }) => void` | — | Called when a trim handle is moved. |
| `label` | `string` | `'Waveform'` | Accessible name for the playhead region. |

The playhead is a `role="slider"` element (`aria-valuemin` 0, `aria-valuemax` `duration`, `aria-valuenow` `position`). Arrow keys move it by one step, clamped to `[0, duration]`; `Home`/`End` jump to the ends. Each trim handle is also a `role="slider"` named "Trim start" / "Trim end", clamped to `[0, trim.end]` and `[trim.start, duration]` respectively.

## Usage

```tsx
import { Waveform } from '@lacuna/waveform'
import { useState } from 'react'

export function WaveformExample() {
  const [position, setPosition] = useState(5)
  const [trim, setTrim] = useState({ start: 2, end: 8 })
  return (
    <Waveform
      peaks={[0.5, 0.8, 0.3, 0.9, 0.6]}
      duration={10}
      position={position}
      onPositionChange={setPosition}
      trim={trim}
      onTrimChange={setTrim}
    />
  )
}
```
