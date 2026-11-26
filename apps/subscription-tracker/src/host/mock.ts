import { createMockRecordStore } from '@lacuna/host-mock'

export interface Subscription {
  id: string
  name: string
  category: string
  cost: number
}

const KEY = 'lacuna.subscription-tracker.subscriptions'

function isSubscription(value: unknown): value is Subscription {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.cost === 'number' &&
    Number.isFinite(v.cost)
  )
}

export const store = createMockRecordStore<Subscription>({
  key: KEY,
  validate: isSubscription,
})
