import { createMockValue } from '@lacuna/host-mock'

export type BestScore = { value: number }

const best = createMockValue<BestScore>({
  key: 'lacuna.mastermind.best',
  fallback: { value: 0 },
  validate: (v: unknown): v is BestScore => {
    const n = (v as { value?: unknown })?.value
    return typeof n === 'number' && Number.isInteger(n) && n >= 0
  },
})

export const host = {
  readBest(): number {
    return best.get().value
  },
  writeBest(value: number) {
    best.set({ value })
  },
}
