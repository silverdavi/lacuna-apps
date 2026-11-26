export interface TaskRecord {
  id: string
  text: string
  done: boolean
  tags: string[]
}

export function isTaskRecord(value: unknown): value is TaskRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    typeof v.done === 'boolean' &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === 'string')
  )
}
