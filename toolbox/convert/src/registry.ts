// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { ConvertResult, Converter, FormatId } from './types'

const key = (from: FormatId, to: FormatId) => `${from}->${to}`

const registry = new Map<string, Converter>()

export function registerConverter(converter: Converter): void {
  registry.set(key(converter.from, converter.to), converter)
}

export function converterFor(from: FormatId, to: FormatId): Converter | null {
  return registry.get(key(from, to)) ?? null
}

export function listConverters(): Converter[] {
  return [...registry.values()]
}

function unsupported(from: FormatId, to: FormatId): ConvertResult {
  return {
    ok: false,
    reason: 'unsupported',
    from,
    to,
    message: `No converter registered for ${from} → ${to}.`,
  }
}

/**
 * Run the registered converter for `from` → `to`. Unknown pairs return a
 * structured `unsupported` result (never throw for a missing registration).
 */
export async function convert(from: FormatId, to: FormatId, input: unknown): Promise<ConvertResult> {
  const c = registry.get(key(from, to))
  if (!c) return unsupported(from, to)
  return c.convert(input)
}
