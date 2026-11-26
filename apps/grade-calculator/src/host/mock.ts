import { createMockRecordStore } from '@lacuna/host-mock'
import { emptyState, makeId, type GradeComponent, type GradeState } from './index'
export { emptyState, makeId }

const KEY = 'lacuna.grade-calculator.components'

function isValidComponent(v: unknown): v is GradeComponent {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.name === 'string' &&
    c.name.trim() !== '' &&
    typeof c.score === 'number' &&
    Number.isFinite(c.score) &&
    c.score >= 0 &&
    c.score <= 100 &&
    typeof c.weight === 'number' &&
    Number.isFinite(c.weight) &&
    c.weight >= 0
  )
}

const store = createMockRecordStore<GradeComponent>({
  key: KEY,
  validate: isValidComponent,
})

export const spaceId = 'mock-grade-calculator'

export const host = {
  read(): GradeState {
    return { components: store.list() }
  },

  write(next: GradeState): GradeState {
    store.replaceAll(next.components)
    return next
  },

  addComponent(name: string, score: number, weight: number): GradeState {
    store.add({ name, score, weight, createdAt: Date.now(), id: makeId() })
    return host.read()
  },

  deleteComponent(id: string): GradeState {
    store.remove(id)
    return host.read()
  },

  clear(): GradeState {
    store.clear()
    return host.read()
  },

  reset(): void {
    store.clear()
  },
}

export { KEY }
export type { GradeComponent, GradeState }
