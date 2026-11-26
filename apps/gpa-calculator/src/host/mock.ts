// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local persistence for the GPA record, backed by @lacuna/host-mock. The real host API will back this in the sandboxed runtime.
import { createMockValue, type MockValue } from '@lacuna/host-mock'

export interface CourseRecord {
  id: string
  name: string
  credits: number
  grade: string
}

export interface GpaRecord {
  id: string
  courses: CourseRecord[]
  scale: '4.0' | '5.0'
}

const STORAGE_KEY = 'lacuna.gpa-calculator.record'

export const DEFAULT_RECORD: GpaRecord = {
  id: 'record-gpa-default',
  courses: [],
  scale: '4.0',
}

function isGpaRecord(value: unknown): value is GpaRecord {
  const v = value as Partial<GpaRecord> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    Array.isArray(v.courses) &&
    (v.scale === '4.0' || v.scale === '5.0') &&
    v.courses.every((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.credits === 'number' && typeof c.grade === 'string')
  )
}

export const gpaStore: MockValue<GpaRecord> = createMockValue<GpaRecord>({
  key: STORAGE_KEY,
  fallback: DEFAULT_RECORD,
  validate: isGpaRecord,
})
