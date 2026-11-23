import { useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { reviewCard, type Grade, type ReviewResult } from '@lacuna/spaced-repetition'
import { addCard, addDeck, deleteDeck, store, todayISO, updateCard, type Deck } from './host/mock'

const TABS = ['Decks', 'Stats'] as const
type Tab = (typeof TABS)[number]

interface StudySession {
  deckId: string
  cardIds: string[]
  index: number
  revealed: boolean
}

export function App() {
  const [tab, setTab] = useState<Tab>('Decks')
  const [decks, setDecks] = useState<Deck[]>(() => store.list())
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckError, setDeckError] = useState<string | null>(null)
  const [addingCardTo, setAddingCardTo] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [cardError, setCardError] = useState<string | null>(null)
  const [study, setStudy] = useState<StudySession | null>(null)

  function saveDeck() {
    const name = deckName.trim()
    if (!name) {
      setDeckError('Type a deck name first')
      return
    }
    if (decks.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setDeckError('A deck with that name already exists')
      return
    }
    addDeck(name)
    setDecks(store.list())
    setDeckName('')
    setDeckError(null)
    setShowNewDeck(false)
  }

  function saveCard() {
    if (!addingCardTo) return
    const f = front.trim()
    const b = back.trim()
    if (!f || !b) {
      setCardError('Both the front and the back are required')
      return
    }
    addCard(addingCardTo, f, b)
    setDecks(store.list())
    setFront('')
    setBack('')
    setCardError(null)
    setAddingCardTo(null)
  }

  function removeDeck(deck: Deck) {
    deleteDeck(deck.id)
    setDecks(store.list())
    setAddingCardTo(null)
  }

  function startStudy(deck: Deck) {
    const due = deck.cards
      .filter((c) => c.dueDate <= todayISO())
      .map((c) => c.id)
    if (due.length === 0) return
    setStudy({ deckId: deck.id, cardIds: due, index: 0, revealed: false })
  }

  function grade(grade: Grade) {
    if (!study) return
    const deck = decks.find((d) => d.id === study.deckId)
    if (!deck) {
      setStudy(null)
      return
    }
    const card = deck.cards.find((c) => c.id === study.cardIds[study.index])
    if (!card) {
      setStudy(null)
      return
    }
    const result: ReviewResult = reviewCard(card, grade, todayISO())
    updateCard(deck.id, card.id, result.card)
    setDecks(store.list())
    const next = study.index + 1
    if (next >= study.cardIds.length) {
      setStudy(null)
    } else {
      setStudy({ ...study, index: next, revealed: false })
    }
  }

  function dueCount(deck: Deck): number {
    const today = todayISO()
    return deck.cards.filter((c) => c.dueDate <= today).length
  }

  const totalCards = decks.reduce((n, d) => n + d.cards.length, 0)
  const totalDue = decks.reduce((n, d) => n + dueCount(d), 0)
  const sessionDeck = study ? decks.find((d) => d.id === study.deckId) : undefined
  const sessionCard =
    study && sessionDeck ? sessionDeck.cards.find((c) => c.id === study.cardIds[study.index]) : undefined

  return (
    <AppShell
      name="Spaced Flashcards App"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
    >
      <Stack lg>
        <div className="lc-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`lc-tab${tab === t ? ' active' : ''}`}
              style={tab === t ? undefined : { color: 'var(--ink-60)' }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Decks' ? (
          <Stack lg>
            <KpiRow>
              <Kpi value={decks.length} label="Decks" />
              <Kpi value={totalCards} label="Cards" />
              <Kpi value={totalDue} label="Due now" accent={totalDue > 0} />
              {totalCards > 0 ? (
                <span className="lc-chip" style={{ alignSelf: 'end' }}>
                  {totalCards} due
                </span>
              ) : null}
            </KpiRow>

            <Card
              mono="Decks"
              title="Your decks"
              actions={
                <Button kind="primary" onClick={() => setShowNewDeck(true)}>
                  New deck
                </Button>
              }
            >
              {decks.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No decks yet"
                  detail="Create a deck and start adding cards."
                  actionLabel="Create a deck"
                  onAction={() => setShowNewDeck(true)}
                />
              ) : study ? null : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {decks.map((deck) => {
                    const due = dueCount(deck)
                    return [
                      <li
                        key={`${deck.id}-deck`}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '12px',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--hairline, var(--ink-10))',
                        }}
                      >
                        <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{deck.name}</span>
                        <span style={{ opacity: 0.65 }}>{deck.cards.length} cards</span>
                        {due > 0 ? <span className="lc-chip">{due} due</span> : null}
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '6px' }}>
                          <Button
                            kind="secondary"
                            onClick={() => startStudy(deck)}
                            disabled={due === 0}
                          >
                            Start study
                          </Button>
                          <Button kind="ghost" onClick={() => setAddingCardTo(deck.id)}>
                            Add card
                          </Button>
                          <button
                            type="button"
                            className="lc-btn ghost"
                            aria-label={`Delete ${deck.name}`}
                            onClick={() => removeDeck(deck)}
                          >
                            Delete
                          </button>
                        </span>
                      </li>,
                      ...deck.cards.map((card) => {
                        const nextDue = new Date(card.dueDate + 'T00:00:00')
                        const dueLabel = nextDue.toDateString()
                        return (
                          <li
                            key={`${deck.id}-${card.id}`}
                            style={{
                              padding: '5px 0 5px 12px',
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'baseline',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{card.front}</span>
                            <span style={{ opacity: 0.65 }}>{card.back}</span>
                            <span style={{ marginLeft: 'auto', opacity: 0.65, fontSize: '0.85rem' }}>
                              {dueLabel}
                            </span>
                          </li>
                        )
                      }),
                    ]
                  })}
                </ul>
              )}
            </Card>

            {showNewDeck ? (
              <Card mono="New" title="New deck">
                <FormGrid>
                  <TextInput
                    label="Deck name"
                    value={deckName}
                    onChange={(v) => {
                      setDeckName(v)
                      if (deckError) setDeckError(null)
                    }}
                    placeholder="Spanish"
                    error={deckError}
                  />
                </FormGrid>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button kind="primary" onClick={saveDeck}>
                    Save deck
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setShowNewDeck(false)
                      setDeckName('')
                      setDeckError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : null}

            {addingCardTo ? (
              <Card
                mono="New card"
                title={`Add card to ${
                  decks.find((d) => d.id === addingCardTo)?.name ?? ''
                }`}
              >
                <FormGrid>
                  <TextInput
                    label="Front"
                    value={front}
                    onChange={(v) => {
                      setFront(v)
                      if (cardError) setCardError(null)
                    }}
                    placeholder="gato"
                    error={cardError}
                  />
                  <TextInput
                    label="Back"
                    value={back}
                    onChange={(v) => {
                      setBack(v)
                      if (cardError) setCardError(null)
                    }}
                    placeholder="cat"
                    error={cardError ? 'Front and back are both required' : undefined}
                  />
                </FormGrid>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button kind="primary" onClick={saveCard}>
                    Save card
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setAddingCardTo(null)
                      setFront('')
                      setBack('')
                      setCardError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : null}

            {study && sessionCard ? (
              <Card mono={`${study.index + 1} of ${study.cardIds.length}`} title="Study">
                <div aria-live="polite" style={{ padding: '16px 0' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{sessionCard.front}</div>
                  {study.revealed ? (
                    <div style={{ fontSize: '1.2rem', opacity: 0.85, marginTop: '12px' }}>
                      {sessionCard.back}
                    </div>
                  ) : null}
                </div>
                {study.revealed ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button kind="danger" onClick={() => grade(0)}>
                      Again
                    </Button>
                    <Button kind="secondary" onClick={() => grade(2)}>
                      Hard
                    </Button>
                    <Button kind="primary" onClick={() => grade(3)}>
                      Good
                    </Button>
                    <Button kind="secondary" onClick={() => grade(4)}>
                      Easy
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button kind="primary" onClick={() => setStudy({ ...study, revealed: true })}>
                      Reveal
                    </Button>
                    <Button
                      kind="ghost"
                      onClick={() => {
                        setStudy(null)
                        setDecks(store.list())
                      }}
                    >
                      Stop
                    </Button>
                  </div>
                )}
              </Card>
            ) : null}
          </Stack>
        ) : (
          <Card mono="Per deck" title="Stats">
            {decks.length === 0 ? (
              <EmptyState
                title="Nothing to report yet"
                detail="Create decks and add cards first."
                actionLabel="Create a deck"
                onAction={() => setShowNewDeck(true)}
              />
            ) : (
              <Table
                label="Per-deck card counts"
                columns={[
                  { key: 'name', label: 'Deck' },
                  { key: 'cards', label: 'Cards', num: true },
                  { key: 'due', label: 'Due', num: true },
                  { key: 'learning', label: 'Learning', num: true },
                  { key: 'mature', label: 'Mature', num: true },
                ]}
                rows={decks.map((d) => ({
                  cells: {
                    name: d.name,
                    cards: `${d.cards.length} cards`,
                    due: dueCount(d),
                    learning: d.cards.filter((c) => c.repetitions === 0 && c.dueDate > todayISO()).length,
                    mature: d.cards.filter((c) => c.repetitions >= 3).length,
                  },
                }))}
                foot={{
                  name: 'Total',
                  cards: `${totalCards} cards`,
                  due: totalDue,
                  learning: decks.reduce(
                    (n, d) => n + d.cards.filter((c) => c.repetitions === 0 && c.dueDate > todayISO()).length,
                    0,
                  ),
                  mature: decks.reduce((n, d) => n + d.cards.filter((c) => c.repetitions >= 3).length, 0),
                }}
              />
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
