// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
export type {
  ConvertInvalid,
  ConvertResult,
  ConvertSuccess,
  ConvertUnsupported,
  ConversionWarning,
  Converter,
  FormatId,
  PlainDocument,
} from './types'
export { convert, converterFor, listConverters, registerConverter } from './registry'
export { documentToText, textToDocument } from './text'
export { textToUtf8, utf8ToText } from './bytes'
export { csvToJson, jsonToCsv, objectsToCsv, parseCsvRecords, type CsvRow } from './csv'

// Register built-ins on import.
import './text'
import './bytes'
import './csv'
