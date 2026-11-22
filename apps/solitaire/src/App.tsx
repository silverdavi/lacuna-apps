import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Keys,
  List,
  Rail,
  Row,
  Stack,
  Tag,
} from '@lacuna/ui'
import { SUIT_SYMBOL, loadGame, saveGame } from './host'
import type { Card as CardT, GameState, Pile, PileKind, Rank, Suit } from './host'
import { EMPTY_BG, FOUNDATION_BG, STOCK_BG, WASTE_BG } from './colors'

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const POINTS: Record<Rank, number> = { A: 0, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10 }

const SEED = 56
const MAX_HISTORY = 24

const BOARD_COLS = 6
const BOARD_ROWS = 1
const BOARD_CELL = 72

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

function firstFreeFoundation(piles: Pile[]): number {
  const foundations = piles.map((p, i) => (p.kind === 'foundation' ? i : -1)).filter((i) => i >= 0)
  const allEmpty = foundations.every((i) => piles[i].cards.length === 0)
  if (allEmpty) return foundations[0]
  return foundations.find((i) => piles[i].cards.length === 0) ?? -1
}

interface Move {
  from: PileKind | 'none'
  to: PileKind
  card: CardT
  delta: number
  step: number
}

interface GameView {
  game: GameState
  log: Move[]
}

const PILE_LABEL: Record<PileKind, string> = { stock: 'Stock', waste: 'Waste', foundation: 'Foundation', tableau: 'Tableau' }

function pileName(index: number, piles: Pile[]): string {
  const pile = piles[index]
  if (pile.kind === 'foundation') return `Foundation ${index - 1}`
  return PILE_LABEL[pile.kind]
}

function topCard(pile: Pile): CardT | null {
  return pile.cards.length > 0 ? pile.cards[pile.cards.length - 1] : null
}

let currentHandler: ((key: string) => void) | null = null
window.addEventListener('keydown', (event) => {
  if (event.key.startsWith('Arrow')) {
    event.preventDefault()
    currentHandler?.(event.key)
  }
})

export function App() {
  const [view, setView] = useState<GameView>(() => {
    const saved = loadGame()
    return saved ? { game: saved, log: [] } : { game: { piles: [], score: 0, best: 0 }, log: [] }
  })
  const dealt = view.game.piles.length > 0
  const best = Math.max(view.game.best, view.game.score)
  const foundationsDone = dealt && view.game.piles.filter((p) => p.kind === 'foundation').every((f) => f.cards.length === 13)
  const foundationsPlaced = dealt ? view.game.piles.filter((p) => p.kind === 'foundation').reduce((n, f) => n + f.cards.length, 0) : 0

  useEffect(() => {
    saveGame(view.game)
  }, [view.game])

  useEffect(() => {
    if (!dealt) {
      currentHandler = null
      return () => {
        currentHandler = null
      }
    }
    currentHandler = (key: string) => {
      setView((prev) => {
        const game = prev.game
        const foundations = game.piles.filter((p) => p.kind === 'foundation')
        const foundationsEmpty = foundations.every((f) => f.cards.length === 0)
        const free = foundationsEmpty ? 0 : foundations.findIndex((f) => f.cards.length === 0)
        const focus = document.activeElement as HTMLElement | null
        const focusedIndex = focus?.dataset?.pileIndex != null ? Number(focus.dataset.pileIndex) : -1
        const pile = focusedIndex >= 0 ? game.piles[focusedIndex] : undefined
        const card = pile?.cards[pile?.cards.length - 1]
        if (!pile || !card) return prev
        const move = (target: number, points: number, logFrom: PileKind | 'none') => {
          const piles = game.piles.map((p, i) => {
            if (i === focusedIndex) return { ...p, cards: p.cards.slice(0, -1) }
            if (i === target) return { ...p, cards: [...p.cards, card] }
            return p
          })
          const score = game.score + points
          const entry: Move = { from: logFrom, to: piles[target].kind, card, delta: points, step: prev.log.length + 1 }
          const log = [entry, ...prev.log].slice(0, MAX_HISTORY)
          return { game: { piles, score, best: Math.max(game.best, score) }, log }
        }
        if (pile.kind === 'stock') {
          if (key === 'ArrowRight') return move(1, 0, 'stock')
        } else if (pile.kind === 'waste') {
          if (key === 'ArrowDown' && free >= 0) return move(2 + free, POINTS[card.rank], 'waste')
        } else if (pile.kind === 'foundation') {
          if (key === 'ArrowUp') return move(1, -POINTS[card.rank], 'foundation')
        }
        return prev
      })
    }
    return () => {
      currentHandler = null
    }
  }, [dealt])

  function applyMove(from: number, to: number, points: number) {
    setView((prev) => {
      const pile = prev.game.piles[from]
      const card = pile?.cards[pile?.cards.length - 1]
      if (!card) return prev
      const piles = prev.game.piles.map((p, i) => {
        if (i === from) return { ...p, cards: p.cards.slice(0, -1) }
        if (i === to) return { ...p, cards: [...p.cards, card] }
        return p
      })
      const score = prev.game.score + points
      const entry: Move = {
        from: pile.kind,
        to: piles[to].kind,
        card,
        delta: points,
        step: prev.log.length + 1,
      }
      const log = [entry, ...prev.log].slice(0, MAX_HISTORY)
      return { game: { piles, score, best: Math.max(prev.game.best, score) }, log }
    })
  }

  const draw = () => {
    if (!dealt) return
    if (view.game.piles[0].cards.length === 0) return
    applyMove(0, 1, 0)
  }

  const sendToFoundation = () => {
    if (!dealt) return
    const card = topCard(view.game.piles[1])
    if (!card) return
    const free = firstFreeFoundation(view.game.piles)
    if (free < 0) return
    applyMove(1, 2 + free, POINTS[card.rank])
  }

  const bringBack = () => {
    if (!dealt) return
    const target = view.game.piles[2]
    const card = topCard(target)
    if (!card) return
    applyMove(2, 1, -POINTS[card.rank])
  }

  function deal() {
    const fresh = newGame()
    fresh.best = Math.max(fresh.best, view.game.best, view.game.score)
    setView({ game: fresh, log: [] })
  }

  const wasteCount = dealt ? view.game.piles[1].cards.length : 0
  const stockCount = dealt ? view.game.piles[0].cards.length : 0
  const foundationsFull = dealt && foundationsDone

  return (
    <AppShell
      name="Solitaire Game"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta={dealt ? `${best} best` : '52 cards'}
      status={!dealt ? 'Deal to begin · local' : foundationsFull ? 'All four foundations complete' : 'In play · local'}
      side={
        <Rail title="Solitaire Game" note="One deck · local" chips={['52 cards', 'Click or keys', 'Best saved', 'Works offline']}>
          <Stack lg>
            <KpiRow>
              <Kpi value={`Score: ${view.game.score}`} label="this deal" accent />
              <Kpi value={`Best: ${best}`} label="on this device" />
              <Kpi value={foundationsPlaced} label="cards home" />
            </KpiRow>
            <Actions>
              <Button onClick={draw} disabled={!dealt || stockCount === 0}>Draw</Button>
              <Button onClick={sendToFoundation} disabled={!dealt || wasteCount === 0}>To foundation</Button>
              <Button onClick={bringBack} disabled={!dealt || !topCard(view.game.piles[2])}>Take back</Button>
            </Actions>
            <Keys
              items={[
                ['Click', 'Send a card to the next pile'],
                ['→', 'Draw from stock'],
                ['↓', 'Waste to foundation'],
                ['↑', 'Foundation back to waste'],
              ]}
            />
            {foundationsFull ? (
              <Tag accent>Game won · four foundations</Tag>
            ) : null}
          </Stack>
        </Rail>
      }
    >
      <Card mono="Table" title="Board" actions={<Actions><Button kind="primary" onClick={deal}>New Game</Button></Actions>}>
        {!dealt ? (
          <EmptyState mono="Empty" title="No board yet" detail="Press New Game to deal the deck, then click the stock to draw or use the arrow keys." />
        ) : (
          <Board cols={BOARD_COLS} rows={BOARD_ROWS} cell={BOARD_CELL} label="Solitaire board">
            {view.game.piles.map((pile, i) => (
              <PileCell key={i} pile={pile} index={i} piles={view.game.piles} onClick={() => {
                if (pile.kind === 'stock') draw()
                else if (pile.kind === 'waste') sendToFoundation()
                else if (pile.kind === 'foundation') bringBack()
              }} />
            ))}
          </Board>
        )}
        {foundationsFull && (
          <EmptyState mono="Won" title="All four foundations complete" detail="Press New Game to deal a fresh deck." />
        )}
      </Card>

      <Card mono="History" title="Moves this deal">
        {view.log.length === 0 ? (
          <EmptyState mono="Empty" title="No moves yet" detail="Each draw, foundation call and take-back is recorded here." />
        ) : (
          <List label="Moves this deal">
            {view.log.map((m) => (
              <Row
                key={m.step}
                title={m.from === 'none' ? 'Deal' : `${PILE_LABEL[m.from]} → ${PILE_LABEL[m.to]}`}
                meta={cardName(m.card)}
                value={m.delta > 0 ? `+${m.delta}` : m.delta < 0 ? `−${-m.delta}` : '—'}
                hot={m.step === view.log[0].step}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}

function cardName(card: CardT): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`
}

const faceStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  userSelect: 'none',
}

function PileCell({ pile, index, piles, onClick }: { pile: Pile; index: number; piles: Pile[]; onClick: () => void }) {
  const name = pileName(index, piles)
  const common = {
    role: 'group' as const,
    'aria-label': name,
    tabIndex: 0,
    'data-pile-index': index,
    onClick,
  }

  if (pile.kind === 'stock') {
    const count = pile.cards.length
    const bg = count > 0 ? STOCK_BG : EMPTY_BG
    return (
      <div {...common} style={{ ...faceStyle, background: bg }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(20px * var(--tf))', color: count > 0 ? 'var(--ink)' : 'var(--ink-40)' }}>
          {count > 0 ? String(count) : '—'}
        </span>
      </div>
    )
  }

  const card = topCard(pile)
  if (!card) {
    const bg = pile.kind === 'waste' ? WASTE_BG : FOUNDATION_BG
    return <div {...common} style={{ ...faceStyle, background: bg }} />
  }

  const bg = pile.kind === 'waste' ? WASTE_BG : FOUNDATION_BG
  const symbolColor = isRed(card.suit) ? 'var(--danger)' : 'var(--ink)'
  return (
    <div {...common} style={{ ...faceStyle, background: bg }}>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color: symbolColor }}>
        <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 'calc(20px * var(--tf))' }}>{card.rank}</span>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))' }}>{SUIT_SYMBOL[card.suit]}</span>
      </span>
    </div>
  )
}

function isRed(suit: Suit): boolean {
  return suit === 'h' || suit === 'd'
}
