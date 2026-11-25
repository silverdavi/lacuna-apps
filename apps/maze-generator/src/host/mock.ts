import { createMockValue } from '@lacuna/host-mock'

export type HistoryStats = {
  best: number
  solved: number
}

const isHistoryStats = (v: unknown): v is HistoryStats => {
  const s = v as Partial<HistoryStats> | null
  return !!s && typeof s.best === 'number' && typeof s.solved === 'number'
}

export const historyStore = createMockValue<HistoryStats>({
  key: 'lacuna.maze-generator.history',
  fallback: { best: 0, solved: 0 },
  validate: isHistoryStats,
})
