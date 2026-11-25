// Record persistence for the standalone build.
// The built app has no Lacuna host, so the gradebook record lives in
// localStorage through @lacuna/host-mock's single-value store.
import { createMockValue } from '@lacuna/host-mock'

export type GradeMap = Record<string, number>

export type RecordData = { students: string[]; grades: GradeMap }

const KEY = 'lacuna.gradebook.record'

export function defaultRecord(): RecordData {
  return { students: [''], grades: {} }
}

export const gradeRecord = createMockValue<RecordData>({
  key: KEY,
  fallback: defaultRecord(),
  validate: (v: unknown): v is RecordData => {
    const r = v as RecordData
    return (
      typeof r?.students === 'object' &&
      Array.isArray(r.students) &&
      r.students.every((s) => typeof s === 'string') &&
      typeof r?.grades === 'object' &&
      r.grades != null
    )
  },
})
