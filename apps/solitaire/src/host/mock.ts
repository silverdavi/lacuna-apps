export type Suit = 's' | 'h' | 'd' | 'c'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

export interface Card {
  suit: Suit
  rank: Rank
}

export type PileKind = 'stock' | 'waste' | 'foundation' | 'tableau'

export interface Pile {
  kind: PileKind
  cards: Card[]
}

export interface GameState {
  piles: Pile[]
  score: number
  best: number
}

export interface HostStore {
  load(): GameState | null
  save(state: GameState): void
  clear(): void
}

const KEY = 'lacuna.solitaire.game'

export function makeMockStore(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): HostStore {
  const store = storage ?? globalThis.localStorage
  return {
    load() {
      const raw = store.getItem(KEY)
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as GameState
        if (!Array.isArray(parsed.piles) || typeof parsed.score !== 'number' || typeof parsed.best !== 'number') return null
        return parsed
      } catch {
        return null
      }
    },
    save(state: GameState) {
      store.setItem(KEY, JSON.stringify(state))
    },
    clear() {
      store.removeItem(KEY)
    },
  }
}
