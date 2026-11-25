// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Word {
  id: string
  /** The word itself. */
  word: string
  /** Its definition. */
  definition: string
  /** SM-2 ease factor. */
  easeFactor: number
  /** SM-2 interval in days. */
  interval: number
  /** SM-2 repetition count. */
  repetitions: number
  /** Next due date, ISO `YYYY-MM-DD` in the browser's local calendar. */
  dueDate: string
}

function isWord(v: unknown): v is Word {
  const w = v as {
    id?: unknown
    word?: unknown
    definition?: unknown
    easeFactor?: unknown
    interval?: unknown
    repetitions?: unknown
    dueDate?: unknown
  }
  return (
    typeof w.id === 'string' &&
    typeof w.word === 'string' &&
    w.word.trim().length > 0 &&
    typeof w.definition === 'string' &&
    typeof w.easeFactor === 'number' &&
    typeof w.interval === 'number' &&
    typeof w.repetitions === 'number' &&
    typeof w.dueDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(w.dueDate)
  )
}

function storageKey(): string {
  try {
    const el = document.getElementById('root')
    return el?.getAttribute('data-branch') ?? 'default'
  } catch {
    return 'default'
  }
}

const BRANCH = storageKey()

export const WORDS_KEY = `lacuna.vocabulary-builder:${BRANCH}:words`

export function loadDeck(): Word[] {
  return wordStore().list()
}

export function wordStore() {
  return createMockRecordStore<Word>({
    key: WORDS_KEY,
    idPrefix: 'word',
    validate: isWord,
  })
}
