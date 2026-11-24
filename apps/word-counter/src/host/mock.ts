// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local draft store for Word Counter. Data never leaves this device.

export interface WordCounterRecord {
  draft: string
  countPunctuation: boolean
}

export const RECORD_KEY = 'lacuna.word-counter.record'

export const DEFAULT_RECORD: WordCounterRecord = {
  draft: '',
  countPunctuation: true,
}
