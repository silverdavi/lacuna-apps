import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export interface Snippet {
  id: string
  title: string
  language: string
  code: string
  tags: string[]
}

function isSnippet(value: unknown): value is Snippet {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.title === 'string' &&
    typeof v.language === 'string' &&
    typeof v.code === 'string' &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === 'string')
  )
}

const store: MockRecordStore<Snippet> = createMockRecordStore<Snippet>({
  key: 'lacuna.snippet-manager.snippets',
  idPrefix: 'snip-',
  validate: isSnippet,
})

export function listSnippets(): Snippet[] {
  return store.list()
}

export function addSnippet(input: Omit<Snippet, 'id'>): Snippet {
  return store.add(input)
}

export function removeSnippet(id: string): boolean {
  return store.remove(id)
}
