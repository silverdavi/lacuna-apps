import { createMockValue } from '@lacuna/host-mock'

export interface HistoryEntry {
  id: string
  input: string
  formatted: string
  at: string
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  const e = v as { id?: unknown; input?: unknown; formatted?: unknown; at?: unknown }
  return (
    typeof e.id === 'string' &&
    typeof e.input === 'string' &&
    typeof e.formatted === 'string' &&
    typeof e.at === 'string'
  )
}

function isWorkspace(v: unknown): v is { input: string; output: string } {
  const w = v as { input?: unknown; output?: unknown }
  return typeof w.input === 'string' && typeof w.output === 'string'
}

export const historyStore = createMockValue<HistoryEntry[]>({
  key: 'lacuna.json-formatter.history.v1',
  fallback: [],
  validate: (v): v is HistoryEntry[] => Array.isArray(v) && v.every(isHistoryEntry),
})

export const workspaceStore = createMockValue<{ input: string; output: string }>({
  key: 'lacuna.json-formatter.workspace.v1',
  fallback: { input: '', output: '' },
  validate: isWorkspace,
})

const HISTORY_CAP = 20

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'at'>) {
  const list = historyStore.get()
  const next: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  }
  historyStore.set([next, ...list].slice(0, HISTORY_CAP))
}

export function listHistory(): HistoryEntry[] {
  return historyStore.get()
}

export function clearHistory() {
  historyStore.set([])
}
