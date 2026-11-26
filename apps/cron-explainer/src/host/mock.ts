import { createMockValue } from '@lacuna/host-mock'

export interface CronState {
  expression: string
}

function isCronState(v: unknown): v is CronState {
  const s = v as { expression?: unknown }
  return typeof s.expression === 'string'
}

export const cronStore = createMockValue<CronState>({
  key: 'lacuna.cron-explainer.state.v1',
  fallback: { expression: '' },
  validate: isCronState,
})
