import { useEffect, useMemo, useState } from 'react'
import { Actions, Body, Card, EmptyState, PrimaryButton, Select, Stack } from '@lacuna/ui'
import { CATEGORIES, DECK, type Card as DeckCard } from '../data/deck'
import type { DeckRecord } from '../host'
import { deckCards, printScale } from '../lib/game'

const PER_SHEET = 18
const BUILTIN = 'builtin'

export function Print({ decks, defaultCategories }: { decks: DeckRecord[]; defaultCategories: string[] }) {
  const [source, setSource] = useState(BUILTIN)
  const [chosen, setChosen] = useState<string[]>(defaultCategories.length > 0 ? defaultCategories : [...CATEGORIES])
  const deck = decks.find((d) => d.id === source)

  const cards: DeckCard[] = useMemo(
    () => (deck ? deckCards(deck) : DECK.filter((c) => chosen.includes(c.category))),
    [deck, chosen],
  )
  const sheets = useMemo(() => {
    const out: DeckCard[][] = []
    for (let i = 0; i < cards.length; i += PER_SHEET) out.push(cards.slice(i, i + PER_SHEET))
    return out
  }, [cards])

  // Print on white paper whatever the screen theme is.
  useEffect(() => {
    const root = document.documentElement
    let saved: string | null | undefined
    const before = () => {
      saved = root.getAttribute('data-appearance')
      root.setAttribute('data-appearance', 'light')
    }
    const after = () => {
      if (saved === undefined) return
      if (saved === null) root.removeAttribute('data-appearance')
      else root.setAttribute('data-appearance', saved)
      saved = undefined
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      after()
    }
  }, [])

  const toggle = (c: string) => setChosen((cur) => CATEGORIES.filter((x) => (x === c ? !cur.includes(c) : cur.includes(x))))

  return (
    <Stack lg>
      <div className="fc-noprint">
        <Card mono="Sheets" title="Print cards">
          <Select
            label="Cards from"
            value={source}
            onChange={setSource}
            options={[{ value: BUILTIN, label: 'Built-in categories' }, ...decks.map((d) => ({ value: d.id, label: `Deck: ${d.name}` }))]}
          />
          {!deck && (
            <div className="lc-pills" role="group" aria-label="Categories to print">
              {CATEGORIES.map((c) => (
                <button type="button" key={c} className={`lc-pill${chosen.includes(c) ? ' active' : ''}`} aria-pressed={chosen.includes(c)} onClick={() => toggle(c)}>{c}</button>
              ))}
            </div>
          )}
          <Body sm>{cards.length} cards on {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'}, 3 across and 6 down, with cut lines. Hold a card to your forehead without looking.</Body>
          <Actions>
            <PrimaryButton onClick={() => window.print()} disabled={cards.length === 0}>Print</PrimaryButton>
          </Actions>
        </Card>
      </div>
      {cards.length === 0 ? (
        <div className="fc-noprint"><EmptyState mono="Empty" title="Nothing to print" detail="Pick a category or a deck with entries." actionLabel="Pick a category" /></div>
      ) : (
        <div className="fc-sheets" data-testid="sheets">
          {sheets.map((sheet, s) => (
            <section className="fc-sheet" key={s} aria-label={`Sheet ${s + 1}`}>
              <div className="fc-grid">
                {sheet.map((c, i) => (
                  <div className="fc-pcard" key={`${c.text}-${i}`}>
                    <div className="fc-ptag">{c.category}</div>
                    <div className="fc-pname"><span className={`fc-p-${printScale(c.text)}`}>{c.text}</span></div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Stack>
  )
}
