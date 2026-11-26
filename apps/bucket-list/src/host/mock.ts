export type Step = { id: string; label: string; done: boolean }

export type Entry = {
  id: string
  title: string
  category: string
  steps: Step[]
}

export function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.category === 'string' &&
    Array.isArray(entry.steps) &&
    entry.steps.every((step) => {
      if (typeof step !== 'object' || step === null) return false
      const s = step as Record<string, unknown>
      return typeof s.id === 'string' && typeof s.label === 'string' && typeof s.done === 'boolean'
    })
  )
}

export const ENTRY_STORAGE_KEY = 'lacuna.bucket-list.entries'
