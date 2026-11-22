// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Document {
  id: string
  name: string
  pageCount: number
}

export interface Signature {
  id: string
  name: string
  data: string
}

export interface Annotation {
  id: string
  documentId: string
  documentName: string
  signatureId: string
  signatureName: string
  page: number
}

function storageKey(): string {
  try {
    const el = document.getElementById('root')
    return el?.getAttribute('data-branch') ?? 'default'
  } catch {
    return 'default'
  }
}

const branch = storageKey()

export function documentStore() {
  const validate = (value: unknown): value is Document => {
    if (typeof value !== 'object' || value === null) return false
    const v = value as Partial<Document>
    return (
      typeof v.name === 'string' &&
      v.name.trim().length > 0 &&
      typeof v.pageCount === 'number' &&
      Number.isFinite(v.pageCount) &&
      v.pageCount >= 1
    )
  }
  return createMockRecordStore<Document>({
    key: `lacuna.pdf-signer:${branch}:documents`,
    idPrefix: 'doc',
    validate,
  })
}

export function signatureStore() {
  const validate = (value: unknown): value is Signature => {
    if (typeof value !== 'object' || value === null) return false
    const v = value as Partial<Signature>
    return (
      typeof v.name === 'string' &&
      v.name.trim().length > 0 &&
      typeof v.data === 'string' &&
      v.data.length > 0
    )
  }
  return createMockRecordStore<Signature>({
    key: `lacuna.pdf-signer:${branch}:signatures`,
    idPrefix: 'sig',
    validate,
  })
}

export function annotationStore() {
  const validate = (value: unknown): value is Annotation => {
    if (typeof value !== 'object' || value === null) return false
    const v = value as Partial<Annotation>
    return (
      typeof v.documentId === 'string' &&
      typeof v.documentName === 'string' &&
      typeof v.signatureId === 'string' &&
      typeof v.signatureName === 'string' &&
      typeof v.page === 'number' &&
      Number.isFinite(v.page) &&
      v.page >= 1
    )
  }
  return createMockRecordStore<Annotation>({
    key: `lacuna.pdf-signer:${branch}:annotations`,
    idPrefix: 'ann',
    validate,
  })
}
