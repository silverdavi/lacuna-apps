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

export function loadSubscriptions(): Subscription[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSubscription)
  } catch {
    return []
  }
}

export function saveSubscriptions(subscriptions: Subscription[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(subscriptions))
}
