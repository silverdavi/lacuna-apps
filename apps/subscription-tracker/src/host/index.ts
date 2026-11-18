import { loadSubscriptions, saveSubscriptions, type Subscription } from './mock'

export type { Subscription }

let nextId = 1

function newId(): string {
  return `subscription-${Date.now()}-${nextId++}`
}

export const host = {
  loadSubscriptions(): Subscription[] {
    return loadSubscriptions()
  },
  addSubscription(name: string, category: string, cost: number): Subscription[] {
    const subscription: Subscription = { id: newId(), name, category, cost }
    const subscriptions = [...loadSubscriptions(), subscription]
    saveSubscriptions(subscriptions)
    return subscriptions
  },
  deleteSubscription(id: string): Subscription[] {
    const subscriptions = loadSubscriptions().filter((s) => s.id !== id)
    saveSubscriptions(subscriptions)
    return subscriptions
  },
}
