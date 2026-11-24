// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useLocalRecord } from '@lacuna/use-local-record'
import { DEFAULT_RECORD, RECORD_KEY, type WordCounterRecord } from './mock'

export type { WordCounterRecord } from './mock'

export function useWordCounter() {
  const { value, set } = useLocalRecord<WordCounterRecord>({
    key: RECORD_KEY,
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })
  return {
    draft: value.draft,
    setDraft: (draft: string) => set((prev) => ({ ...prev, draft })),
    countPunctuation: value.countPunctuation,
    setCountPunctuation: (countPunctuation: boolean) => set((prev) => ({ ...prev, countPunctuation })),
  }
}
