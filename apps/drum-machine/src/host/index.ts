// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
export interface DrumState {
  pattern: number[]
  tempo: number
}

export interface DrumStore {
  read(): DrumState
  write(state: DrumState): void
}
