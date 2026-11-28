// Mock host: stores forehead-deck records, the settings and the team names in localStorage so the
// whole app runs offline. A real host replaces this file with records API calls.
export type DeckRecord = {
  id: string
  name: string
  category: string
  entries: string[]
}

export type Settings = {
  categories: string[]
  seconds: 30 | 60 | 90 | 120
  includeCustom: boolean
  controls: 'tap' | 'tilt'
  teamMode: boolean
  teamCount: number
  teamNames: string[]
  sound: boolean
}

const DECKS_KEY = 'lacuna.forehead-cards.decks'
const SETTINGS_KEY = 'lacuna.forehead-cards.settings'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable; changes live for this session only
  }
}

function validDeck(d: unknown): d is DeckRecord {
  if (!d || typeof d !== 'object') return false
  const r = d as DeckRecord
  return typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.entries)
}

export const mockStore = {
  listDecks(): DeckRecord[] {
    const raw = read<unknown[]>(DECKS_KEY)
    return Array.isArray(raw) ? raw.filter(validDeck).map((d) => ({ ...d, category: typeof d.category === 'string' ? d.category : '' })) : []
  },
  saveDeck(deck: DeckRecord): DeckRecord[] {
    const all = mockStore.listDecks()
    const at = all.findIndex((d) => d.id === deck.id)
    if (at >= 0) all[at] = deck
    else all.push(deck)
    write(DECKS_KEY, all)
    return all
  },
  deleteDeck(id: string): DeckRecord[] {
    const all = mockStore.listDecks().filter((d) => d.id !== id)
    write(DECKS_KEY, all)
    return all
  },
  restoreDeck(deck: DeckRecord, index: number): DeckRecord[] {
    const all = mockStore.listDecks().filter((d) => d.id !== deck.id)
    all.splice(Math.min(index, all.length), 0, deck)
    write(DECKS_KEY, all)
    return all
  },
  newDeckId(): string {
    return `deck-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
  },
  readSettings(defaults: Settings): Settings {
    const raw = read<Partial<Settings>>(SETTINGS_KEY)
    if (!raw || typeof raw !== 'object') return defaults
    const merged = { ...defaults, ...raw }
    if (![30, 60, 90, 120].includes(merged.seconds)) merged.seconds = defaults.seconds
    if (!Array.isArray(merged.categories)) merged.categories = defaults.categories
    if (!Array.isArray(merged.teamNames)) merged.teamNames = defaults.teamNames
    merged.teamCount = Math.min(6, Math.max(2, Number(merged.teamCount) || 2))
    return merged
  },
  writeSettings(settings: Settings) {
    write(SETTINGS_KEY, settings)
  },
}
