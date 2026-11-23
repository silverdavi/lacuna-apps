// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/waveform 0.1.0: snapshot of lacuna-components Waveform at c16104e by sync-toolbox-components.py; a change gets a new version.
export interface WaveformProps {
  /** Array of amplitude values, each 0-1, representing waveform peaks. */
  peaks: number[]
  /** Total duration of the audio in seconds. */
  duration: number
  /** Current playhead position in seconds. */
  position: number
  /** Called when the user scrubs the playhead to a new position (seconds). */
  onPositionChange: (position: number) => void
  /** If provided, shows trim handles at these positions (seconds). */
  trim?: { start: number; end: number }
  /** Called when the user drags a trim handle. */
  onTrimChange?: (trim: { start: number; end: number }) => void
  /** Optional accessible label for the waveform region. */
  label?: string
}

export { Waveform } from './Waveform'
