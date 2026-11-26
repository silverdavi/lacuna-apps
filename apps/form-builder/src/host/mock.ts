import { createMockRecordStore } from '@lacuna/host-mock'

export interface FormField {
  id: string
  label: string
  type: string
  required: boolean
}

export interface FormRecord {
  id: string
  name: string
  fields: FormField[]
}

function isFormRecord(v: unknown): v is FormRecord {
  const r = v as Record<string, unknown>
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    Array.isArray(r.fields)
  )
}

export const formStore = createMockRecordStore<FormRecord>({
  key: 'form-builder.forms',
  validate: isFormRecord,
})
