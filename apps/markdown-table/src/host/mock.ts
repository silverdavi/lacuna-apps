// Space-scoped persistence for the Markdown table app.
// The source text and the saved snapshots are kept in the space's mock
// storage (localStorage) so a session survives a reload. State is rehydrated
// on load and written on every change.

import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

const TEXT_KEY = 'lacuna.markdown-table.source'
const SNAPSHOT_KEY = 'lacuna.markdown-table.snapshots'
const SNAPSHOT_LIMIT = 8

export interface Snapshot {
  id: string
  text: string
  rows: number
  columns: number
  at: number
}

function isText(v: unknown): v is string {
  return typeof v === 'string'
}

const textStore = createMockValue<string>({ key: TEXT_KEY, fallback: '', validate: isText })

export function loadText(): string {
  return textStore.get()
}

export function saveText(text: string): string {
  textStore.set(text)
  return text
}

export function clearText(): string {
  textStore.set('')
  return ''
}

function isSnapshot(v: unknown): v is Snapshot {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.text === 'string' &&
    typeof r.rows === 'number' &&
    typeof r.columns === 'number' &&
    typeof r.at === 'number'
  )
}

function isSnapshots(v: unknown): v is Snapshot[] {
  return Array.isArray(v) && v.every(isSnapshot)
}

const snapshotStore = createMockRecordStore<Snapshot>({
  key: SNAPSHOT_KEY,
  idPrefix: 'snap',
  validate: isSnapshot,
})

export function loadSnapshots(): Snapshot[] {
  return snapshotStore.list()
}

export function pushSnapshot(snapshot: Omit<Snapshot, 'id'>): Snapshot[] {
  snapshotStore.add(snapshot)
  const all = snapshotStore.list()
  while (all.length > SNAPSHOT_LIMIT) {
    const oldest = all[all.length - 1]
    if (!snapshotStore.remove(oldest.id)) break
    all.pop()
  }
  return snapshotStore.list()
}

export function replaceSnapshot(id: string, text: string): Snapshot[] {
  snapshotStore.update(id, { text, at: Date.now() })
  return snapshotStore.list()
}

export function removeSnapshot(id: string): Snapshot[] {
  snapshotStore.remove(id)
  return snapshotStore.list()
}

export function clearSnapshots(): Snapshot[] {
  snapshotStore.clear()
  return []
}
