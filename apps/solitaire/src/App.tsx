import { useEffect, useState } from 'react'
import { Actions, AppShell, Board, Button, Card, EmptyState, Keys, MonoLabel, Rail, Stack, Tag } from '@lacuna/ui'
import { FOUNDATION_BG, EMPTY_BG, STOCK_BG, WASTE_BG } from './colors'
import { loadGame, saveGame, type Card as CardT, type GameState, type Pile, type PileKind, type Rank, type Suit } from './host'

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const POINTS: Record<Rank, number> = { A: 0, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10 }

const SEED = 56

function seededShuffle(cards: CardT[]): CardT[] {
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
  const deck = SUITS.flatMap((suit) => RANKS.map((rank): CardT => ({ suit, rank })))
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

function pileName(index: number, piles: Pile[]): string {
  const pile = piles[index]
  if (pile.kind === 'foundation') return `Foundation ${index - 1}`
  return PILE_LABEL[pile.kind]
}

function pileCell(pile: Pile): { bg: string; text: string } {
  if (pile.kind === 'stock') {
    return pile.cards.length > 0 ? { bg: STOCK_BG, text: String(pile.cards.length) } : { bg: EMPTY_BG, text: '' }
  }
  const top = pile.cards[pile.cards.length - 1]
  if (!top) return { bg: EMPTY_BG, text: '' }
  return { bg: pile.kind === 'waste' ? WASTE_BG : FOUNDATION_BG, text: top.rank }
}

let currentHandler: ((key: string) => void) | null = null

window.addEventListener('keydown', (event) => {
  if (event.key.startsWith('Arrow')) {
    event.preventDefault()
    currentHandler?.(event.key)
  }
})

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame() ?? { piles: [], score: 0, best: 0 })
  const dealt = game.piles.length > 0

  useEffect(() => {
    saveGame(game)
  }, [game])

  useEffect(() => {
    if (!dealt) {
      currentHandler = null
      return () => {
        currentHandler = null
      }
    }
    currentHandler = (key: string) => {
      const foundations = game.piles.filter((p) => p.kind === 'foundation')
      const foundationsEmpty = foundations.every((f) => f.cards.length === 0)
      const free = foundationsEmpty ? 0 : foundations.findIndex((f) => f.cards.length === 0)
      const focus = document.activeElement as HTMLElement | null
      const focusedIndex = focus?.dataset?.pileIndex != null ? Number(focus.dataset.pileIndex) : -1
      const pile = focusedIndex >= 0 ? game.piles[focusedIndex] : undefined
      const card = pile?.cards[pile?.cards.length - 1]
      if (!pile || !card) return
      const moveCard = (target: number, points: number) => {
        const piles = game.piles.map((p, i) => {
          if (i === focusedIndex) return { ...p, cards: p.cards.slice(0, -1) }
          if (i === target) return { ...p, cards: [...p.cards, card] }
          return p
        })
        const score = game.score + points
        setGame({ piles, score, best: Math.max(game.best, score) })
      }
      if (pile.kind === 'stock') {
        if (key === 'ArrowRight') moveCard(1, 0)
      } else if (pile.kind === 'waste') {
        if (key === 'ArrowDown' && free >= 0) moveCard(2 + free, POINTS[card.rank])
      } else if (pile.kind === 'foundation') {
        if (key === 'ArrowUp') moveCard(1, -POINTS[card.rank])
      }
    }
    return () => {
      currentHandler = null
    }
  }, [game, dealt])

  const best = Math.max(game.best, game.score)
  const foundationsDone = dealt && game.piles.filter((p) => p.kind === 'foundation').every((f) => f.cards.length === 13)

  function deal() {
    const fresh = newGame()
    fresh.best = Math.max(fresh.best, game.best, game.score)
    setGame(fresh)
  }

  return (
    <AppShell
      name="Solitaire Game"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta={dealt ? `${best} best` : '52 cards'}
      status={dealt ? 'Local · no network' : 'Deal to begin · local'}
      side={
        <Rail title="Solitaire Game" note="One deck · local" chips={['52 cards', 'Works offline']}>
          <Stack>
            <MonoLabel sm>Score: {game.score}</MonoLabel>
            <MonoLabel sm>Best: {best}</MonoLabel>
          </Stack>
          <Keys
            items={[
              ['→', 'Draw from stock'],
              ['↓', 'Waste to foundation'],
              ['↑', 'Foundation back to waste'],
            ]}
          />
          {foundationsDone ? (
            <Tag accent>Game won</Tag>
          ) : null}
        </Rail>
      }
    >
      <Card mono={dealt ? 'Table' : 'Table'} title="Board" actions={<Actions><Button kind="primary" onClick={deal}>New Game</Button></Actions>}>
        {!dealt ? (
          <EmptyState mono="Empty" title="No board yet" detail="Press New Game to deal the deck." />
        ) : (
          <Board cols={6} rows={1} cell={56} label="Board">
            {game.piles.map((pile, i) => {
              const cell = pileCell(pile)
              return (
                <div
                  key={i}
                  role="group"
                  aria-label={pileName(i, game.piles)}
                  tabIndex={0}
                  data-pile-index={i}
                  style={{ background: cell.bg }}
                >
                  {cell.text}
                </div>
              )
            })}
          </Board>
        )}
      </Card>
    </AppShell>
  )
}
