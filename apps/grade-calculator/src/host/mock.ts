// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// grade calculator's components in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type GradeComponent,
  type GradeState,
} from './index'

const KEY = 'lacuna.grade-calculator.state'

export const spaceId = 'mock-grade-calculator'

export const host = {
  read(): GradeState {
    return loadState()
  },

  write(next: GradeState): GradeState {
    saveState(next)
    return next
  },

  addComponent(name: string, score: number, weight: number): GradeState {
    const state = loadState()
    const component: GradeComponent = { id: makeId(), name, score, weight, createdAt: Date.now() }
    state.components.push(component)
    return host.write(state)
  },

  deleteComponent(id: string): GradeState {
    const state = loadState()
    state.components = state.components.filter((c) => c.id !== id)
    return host.write(state)
  },

  clear(): GradeState {
    return host.write(emptyState())
  },

  reset(): void {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}

export { KEY }
export type { GradeComponent, GradeState }
