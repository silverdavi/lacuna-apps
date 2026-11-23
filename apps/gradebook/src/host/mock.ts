// Record persistence for the standalone build.
// The built app has no Lacuna host, so the gradebook record lives in
// localStorage through @lacuna/host-mock's single-value store.
import { createMockValue } from '@lacuna/host-mock'
import type { RecordData } from '../App'

const KEY = 'lacuna.gradebook.record'

export const gradeRecord = createMockValue<RecordData>({
  key: KEY,
  fallback: { students: [], grades: {} },
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
