// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface ConversionEntry {
  id: string
  inputName: string
  outputName: string
  outputFormat: string
}

const KEY = 'lacuna.file-converter.mock.v1'

function isConversion(v: unknown): v is ConversionEntry {
  const e = v as { id?: unknown; inputName?: unknown; outputName?: unknown; outputFormat?: unknown }
  return (
    typeof e.id === 'string' &&
    typeof e.inputName === 'string' &&
    typeof e.outputName === 'string' &&
    typeof e.outputFormat === 'string'
  )
}

export const store = createMockRecordStore<ConversionEntry>({
  key: KEY,
  validate: isConversion,
})
