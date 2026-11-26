// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Conversion = {
  id: string
  value: string
  words: string
  caseStyle: 'lower' | 'upper' | 'title'
  savedAt: string
}

function isConversion(value: unknown): value is Conversion {
  const v = value as Partial<Conversion>
  return (
    typeof v.id === 'string' &&
    typeof v.value === 'string' &&
    typeof v.words === 'string' &&
    typeof v.caseStyle === 'string' &&
    typeof v.savedAt === 'string'
  )
}

export const conversions = createMockRecordStore<Conversion>({
  key: 'lacuna.number-to-words.conversions',
  idPrefix: 'conv',
  validate: isConversion,
})
