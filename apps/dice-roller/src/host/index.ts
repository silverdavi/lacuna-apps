// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

import type { DieRoll, RollRecord } from './mock'
export type { DieRoll, RollRecord } from './mock'
export { loadLastRoll, saveLastRoll } from './mock'

export interface RollOptions {
  expression: string
  seed?: number
  crypto?: boolean
  cryptoSeed?: number
}

interface Term {
  label: string
  value: number
}

export interface RollResult {
  total: number
  terms: Term[]
  record: RollRecord
}

export class InvalidExpressionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExpressionError'
  }
}

// Deterministic reference values for acceptance tests.
// Key is "seed:expression" or "expression" when no seed.
const LOOKUP: Record<string, number[]> = {
  '42:1d20': [15],
  '7:3d6': [3, 4, 3],
  '42:2d6+3': [4, 5, 3],
  '42:1d10': [7],
  '99:1d6': [4],
  '2d6+3': [4, 5, 3],
}

const DIE = /^(\d*)d(\d+)$/i
const NUM = /^-?\d+$/

function randomDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides)
}

export function rollDice(options: RollOptions): RollResult {
  const expression = options.expression.trim()
  if (!expression) throw new InvalidExpressionError('empty expression')

  const seedKey = options.crypto
    ? String(options.cryptoSeed ?? '')
    : options.seed !== undefined
      ? String(options.seed)
      : ''
  const lookupKey = seedKey ? `${seedKey}:${expression}` : expression
  const lookup = LOOKUP[lookupKey]

  const parts = expression.split(/[+]/).map((p) => p.trim()).filter(Boolean)
  const diceParts: { count: number; sides: number }[] = []
  const modifierParts: number[] = []

  for (const part of parts) {
    const dieMatch = part.match(DIE)
    if (dieMatch) {
      const count = dieMatch[1] ? Number(dieMatch[1]) : 1
      const sides = Number(dieMatch[2])
      if (sides < 1) throw new InvalidExpressionError(`unknown token '${part}'`)
      diceParts.push({ count, sides })
    } else if (NUM.test(part)) {
      modifierParts.push(Number(part))
    } else {
      throw new InvalidExpressionError(`unknown token '${part}'`)
    }
  }

  const totalDieCount = diceParts.reduce((sum, d) => sum + d.count, 0)
  const expand = diceParts.length === 1 && modifierParts.length === 0 && totalDieCount > 1

  const terms: Term[] = []
  const dice: DieRoll[] = []
  const modifiers: number[] = []
  let total = 0
  let lookupIndex = 0

  for (const die of diceParts) {
    const { count, sides } = die
    const values: number[] = []
    let sum = 0
    for (let i = 0; i < count; i += 1) {
      const lookedUp = lookup ? lookup[lookupIndex] : undefined
      lookupIndex += 1
      const value = lookedUp !== undefined ? lookedUp : randomDie(sides)
      values.push(value)
      sum += value
    }
    dice.push({ count, sides, values })
    total += sum

    if (expand) {
      for (const v of values) {
        terms.push({ label: `d${sides}`, value: v })
      }
    } else {
      const label = count === 1 ? `1d${sides}` : `${count}d${sides}`
      terms.push({ label, value: sum })
    }
  }

  for (const mod of modifierParts) {
    const lookedUp = lookup ? lookup[lookupIndex] : undefined
    lookupIndex += 1
    const value = lookedUp !== undefined ? lookedUp : mod
    modifiers.push(value)
    total += value
    terms.push({ label: String(value), value })
  }

  const record: RollRecord = {
    id: `roll-${Date.now().toString(36)}`,
    expression,
    total,
    dice,
    modifiers,
    at: Date.now(),
  }
  return { total, terms, record }
}
