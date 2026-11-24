// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { store, type ConversionEntry } from './mock'

export type { ConversionEntry }

export function listConversions(): ConversionEntry[] {
  return store.list()
}

export function addConversion(inputName: string, outputName: string, outputFormat: string): ConversionEntry {
  return store.add({ inputName, outputName, outputFormat })
}

export function clearConversions(): void {
  store.clear()
}
