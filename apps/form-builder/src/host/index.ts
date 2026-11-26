import { useState } from 'react'
import { formStore } from './mock'
import type { FormField, FormRecord } from './mock'

export type { FormField, FormRecord }

export interface UseForms {
  forms: FormRecord[]
  createForm: (name: string) => FormRecord
  updateForm: (id: string, patch: Partial<Omit<FormRecord, 'id'>>) => FormRecord | undefined
  deleteForm: (id: string) => boolean
}

export function useForms(): UseForms {
  const [forms, setForms] = useState<FormRecord[]>(() => formStore.list())

  function refresh() {
    setForms(formStore.list())
  }

  function createForm(name: string): FormRecord {
    const created = formStore.add({ name, fields: [] })
    refresh()
    return created
  }

  function updateForm(id: string, patch: Partial<Omit<FormRecord, 'id'>>): FormRecord | undefined {
    const updated = formStore.update(id, patch)
    refresh()
    return updated
  }

  function deleteForm(id: string): boolean {
    const removed = formStore.remove(id)
    refresh()
    return removed
  }

  return { forms, createForm, updateForm, deleteForm }
}
