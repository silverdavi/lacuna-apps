export type GradeComponent = {
  id: string
  name: string
  score: number
  weight: number
  createdAt: number
}

export type GradeState = {
  components: GradeComponent[]
}

export const emptyState = (): GradeState => ({ components: [] })

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `g-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}
