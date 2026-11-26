import { createMockRecordStore } from '@lacuna/host-mock'
import { newCard, type CardState } from '@lacuna/spaced-repetition'
import { toISODate } from '@lacuna/date-math'

export interface DeckCard extends CardState {
  front: string
  back: string
}

export interface Deck {
  id: string
  name: string
  cards: DeckCard[]
}

const KEY = 'lacuna.flashcards.mock.v1'

function isDeck(v: unknown): v is Deck {
  const d = v as { id?: unknown; name?: unknown; cards?: unknown }
  if (typeof d.id !== 'string' || typeof d.name !== 'string') return false
  if (!Array.isArray(d.cards)) return false
  return d.cards.every((c) => {
    const card = c as Record<string, unknown>
    return (
      typeof card.id === 'string' &&
      typeof card.front === 'string' &&
      typeof card.back === 'string' &&
      typeof card.easeFactor === 'number' &&
      typeof card.interval === 'number' &&
      typeof card.repetitions === 'number' &&
      typeof card.dueDate === 'string'
    )
  })
}

export const store = createMockRecordStore<Deck>({
  key: KEY,
  validate: isDeck,
})

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDeck(name: string): Deck {
  return store.add({ name, cards: [] })
}

export function addCard(deckId: string, front: string, back: string): DeckCard {
  const deck = store.get(deckId)
  if (!deck) throw new Error('unknown deck')
  const card = newCard(crypto.randomUUID(), todayISO())
  const created: DeckCard = { ...card, front, back }
  store.update(deckId, { cards: [...deck.cards, created] })
  return created
}

export function deleteDeck(id: string) {
  store.remove(id)
}

export function updateCard(deckId: string, cardId: string, next: CardState) {
  const deck = store.get(deckId)
  if (!deck) return
  store.update(deckId, {
    cards: deck.cards.map((c) => (c.id === cardId ? { ...c, ...next } : c)),
  })
}

export function exportAll() {
  const file = {
    version: 1,
    appId: 'lacuna.flashcards',
    exportedAt: Date.now(),
    records: store.list().map((d) => ({
      id: d.id,
      data: d,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
  }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lacuna-flashcards-backup.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
