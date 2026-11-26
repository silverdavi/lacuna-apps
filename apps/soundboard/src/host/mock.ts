// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, createMockValue, type MockRecordStore, type MockValue } from '@lacuna/host-mock'

export interface Clip {
  id: string
  name: string
  durationMs: number
}

export interface Scores {
  score: number
  best: number
}

export interface SoundboardHost {
  clips: MockRecordStore<Clip>
  scores: MockValue<Scores>
}

const emptyScores: Scores = { score: 0, best: 0 }

function isClip(value: unknown): value is Clip {
  const v = value as Partial<Clip>
  return (
    typeof v?.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.durationMs === 'number'
  )
}

function isScores(value: unknown): value is Scores {
  const v = value as Partial<Scores>
  return typeof v?.score === 'number' && typeof v.best === 'number'
}

export function createSoundboardHost(): SoundboardHost {
  return {
    clips: createMockRecordStore<Clip>({ key: 'soundboard.clips', idPrefix: 'clip-', validate: isClip }),
    scores: createMockValue<Scores>({ key: 'soundboard.scores', fallback: emptyScores, validate: isScores }),
  }
}
