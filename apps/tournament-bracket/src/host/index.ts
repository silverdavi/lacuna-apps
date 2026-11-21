import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type Player = {
  id: string
  name: string
  seed: number
}

const isPlayer = (v: unknown): v is Player => {
  const p = v as { name?: unknown; seed?: unknown }
  return typeof p.name === 'string' && p.name.length > 0 && typeof p.seed === 'number'
}

const isWinnerMap = (v: unknown): v is Record<string, string> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  return Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string')
}

export const players = createMockRecordStore<Player>({
  key: 'tb-players',
  validate: isPlayer,
  idPrefix: 'p-',
})

export const matchWinners = createMockValue<Record<string, string>>({
  key: 'tb-winners',
  fallback: {},
  validate: isWinnerMap,
})
