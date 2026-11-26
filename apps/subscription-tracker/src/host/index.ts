import { store, type Subscription } from './mock'

export type { Subscription }

export const host = {
  loadSubscriptions(): Subscription[] {
    return store.list()
  },
  addSubscription(name: string, category: string, cost: number): Subscription[] {
    store.add({ name, category, cost, id: `subscription-${Date.now()}-${Math.floor(Math.random() * 1e6)}` })
    return store.list()
  },
  deleteSubscription(id: string): Subscription[] {
    store.remove(id)
    return store.list()
  },
}
