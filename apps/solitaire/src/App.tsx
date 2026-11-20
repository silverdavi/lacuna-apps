import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Body, Button, MonoLabel, Stack } from '@lacuna/ui'
import { loadGame, saveGame, type Card, type GameState, type PileKind, type Rank, type Suit } from './host'
import './styles.css'

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const SUIT_MARK: Record<Suit, string> = { s: 'S', h: 'H', d: 'D', c: 'C' }
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const POINTS: Record<Rank, number> = { A: 0, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10 }

const SEED = 56

function seededShuffle(cards: Card[]): Card[] {
  let state = SEED
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out = cards.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function newGame(): GameState {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank): Card => ({ suit, rank })))
  const shuffled = seededShuffle(deck)
  const piles: GameState['piles'] = [
    { kind: 'stock', cards: shuffled.slice(0, 24) },
    { kind: 'waste', cards: [] },
    { kind: 'foundation', cards: [] },
    { kind: 'foundation', cards: [] },
    { kind: 'foundation', cards: [] },
    { kind: 'foundation', cards: [] },
  ]
  return { piles, score: 0, best: 0 }
}

const PILE_LABEL: Record<PileKind, string> = { stock: 'Stock', waste: 'Waste', foundation: 'Foundation', tableau: 'Tableau' }

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame() ?? { piles: [], score: 0, best: 0 })
  const dealt = game.piles.length > 0

  useEffect(() => {
    saveGame(game)
  }, [game])

  const foundations = game.piles.filter((p) => p.kind === 'foundation')
  const foundationsEmpty = foundations.every((f) => f.cards.length === 0)

  const best = Math.max(game.best, game.score)

  function deal() {
    const fresh = newGame()
    fresh.best = Math.max(fresh.best, game.best, game.score)
    setGame(fresh)
  }

  function move(pileIndex: number, key: string) {
    const pile = game.piles[pileIndex]
    const card = pile.cards[pile.cards.length - 1]
    if (!card) return
    const moveCard = (target: number, points: number) => {
      const piles = game.piles.map((p, i) => {
        if (i === pileIndex) return { ...p, cards: p.cards.slice(0, -1) }
        if (i === target) return { ...p, cards: [...p.cards, card] }
        return p
      })
      const score = game.score + points
      setGame({ piles, score, best: Math.max(game.best, score) })
    }
    if (pile.kind === 'stock') {
      if (key === 'ArrowRight' && card) moveCard(1, 0)
    } else if (pile.kind === 'waste') {
      if (key === 'ArrowDown') {
        const free = foundationsEmpty ? 0 : foundations.findIndex((f) => f.cards.length === 0)
        if (free >= 0) moveCard(2 + free, POINTS[card.rank])
      }
    } else if (pile.kind === 'foundation') {
      if (key === 'ArrowUp') moveCard(1, -POINTS[card.rank])
    }
  }

  function pileName(index: number): string {
    const pile = game.piles[index]
    if (pile.kind === 'foundation') return `Foundation ${index - 1}`
    return PILE_LABEL[pile.kind]
  }

  return (
    <main className="sol" style={styles.page}>
      <header style={styles.head}>
        <h1 style={styles.title}>Solitaire Game</h1>
        <Stack style={{ alignSelf: 'flex-end' }}>
          <MonoLabel sm>Score: {game.score}</MonoLabel>
          <MonoLabel sm>Best: {best}</MonoLabel>
        </Stack>
      </header>
      <div style={styles.controls}>
        <Button kind="primary" onClick={deal}>New Game</Button>
        {!dealt && <Body sm>Deal the board to begin.</Body>}
      </div>
      {dealt && (
        <div role="group" aria-label="Board" style={styles.board}>
          {game.piles.map((pile, i) => (
            <div
              key={i}
              role="group"
              aria-label={pileName(i)}
              className="sol-pile"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key.startsWith('Arrow')) {
                  e.preventDefault()
                  move(i, e.key)
                }
              }}
              style={styles.pile}
            >
              {pile.kind === 'stock' && pile.cards.length > 0 ? (
                <div style={styles.count} aria-hidden="true">
                  {pile.cards.length}
                </div>
              ) : pile.cards.length > 0 ? (
                <div style={styles.card} aria-hidden="true">
                  {pile.cards[pile.cards.length - 1].rank}
                  <span style={styles.suit}>{SUIT_MARK[pile.cards[pile.cards.length - 1].suit]}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))', minHeight: '100vh' },
  title: { fontSize: 'calc(24px * var(--tf))', fontWeight: 700, color: 'var(--ink)' },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'calc(16px * var(--sf))' },
  controls: { display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--sf))' },
  board: { display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: 'calc(16px * var(--sf))' },
  pile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 'calc(8px * var(--sf))',
    padding: 'calc(16px * var(--sf))',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
    borderRadius: 'calc(4px * var(--sf))',
  },
  count: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(64px * var(--sf))',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) dashed var(--ink-40)',
    borderRadius: 'calc(4px * var(--sf))',
    fontSize: 'calc(20px * var(--tf))',
    fontWeight: 700,
    color: 'var(--ink)',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'calc(4px * var(--sf))',
    height: 'calc(64px * var(--sf))',
    background: 'var(--ui-card)',
    border: 'calc(1px * var(--sf)) solid var(--ink-80)',
    borderRadius: 'calc(4px * var(--sf))',
    fontSize: 'calc(18px * var(--tf))',
    fontWeight: 600,
  },
  suit: { fontSize: 'calc(12px * var(--tf))', color: 'var(--mid)' },
}
