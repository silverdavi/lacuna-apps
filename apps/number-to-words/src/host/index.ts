// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { conversions, type Conversion } from './mock'

export type { Conversion }

export function listConversions(): Conversion[] {
  return conversions.list()
}

export function saveConversion(record: Omit<Conversion, 'id'>): Conversion {
  return conversions.add(record)
}

export function deleteConversion(id: string): boolean {
  return conversions.remove(id)
}
