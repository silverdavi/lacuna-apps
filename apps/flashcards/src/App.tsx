import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { reviewCard, type Grade, type ReviewResult } from '@lacuna/spaced-repetition'
import {
  addCard,
  addDeck,
  deleteDeck,
  exportAll,
  store,
  todayISO,
  updateCard,
  type Deck,
} from './host/mock'

const TABS = ['Decks', 'Stats'] as const
type Tab = (typeof TABS)[number]

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

interface StudySession {
  deckId: string
  cardIds: string[]
  index: number
  revealed: boolean
}

function tomorrowISO(): string {
  const d = new Date(Date.now() + 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dueCount(deck: Deck): number {
  const cutoff = tomorrowISO()
  return deck.cards.filter((c) => c.dueDate <= cutoff).length
}

function TabList({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="lc-tabs" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === active}
          className={cx('fc-tab', t === active && 'active')}
          onClick={() => onSelect(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )
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
  const [exportNote, setExportNote] = useState<string | null>(null)

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
    const cutoff = tomorrowISO()
    const due = deck.cards
      .filter((c) => c.dueDate <= cutoff)
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

  function exportDecks() {
    exportAll()
    setExportNote('Downloaded a JSON backup of every deck')
  }

  const totalCards = decks.reduce((n, d) => n + d.cards.length, 0)
  const totalDue = decks.reduce((n, d) => n + dueCount(d), 0)
  const sessionDeck = study ? decks.find((d) => d.id === study.deckId) : undefined
  const sessionCard =
    study && sessionDeck ? sessionDeck.cards.find((c) => c.id === study.cardIds[study.index]) : undefined

  const statusText = exportNote
    ? exportNote
    : study
      ? `${study.index + 1} of ${study.cardIds.length} in session`
      : totalDue > 0
        ? `${totalDue} card${totalDue === 1 ? '' : 's'} due`
        : totalCards > 0
          ? 'All caught up'
          : `${decks.length} deck${decks.length === 1 ? '' : 's'}`

  return (
    <AppShell
      name="Spaced Flashcards App"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
      status={statusText}
      side={
        <Rail
          title="Deck tools"
          note={`${decks.length} deck${decks.length === 1 ? '' : 's'}`}
          chips={['SM-2', 'Decks', 'Cards']}
        >
          <Card mono="Backup" title="Keep your cards">
            <p className="lk-rail-text">
              Save every deck and card as a JSON file, or start a session on any deck that has cards due.
            </p>
            <Actions>
              <Button kind="secondary" onClick={exportDecks} disabled={decks.length === 0}>
                Export decks
              </Button>
            </Actions>
          </Card>
        </Rail>
      }
    >
      <TabList active={tab} onSelect={setTab} />

      {tab === 'Decks' ? (
        <Stack lg>
          <KpiRow>
            <Kpi value={decks.length} label="Decks" />
            <Kpi value={totalCards} label="Cards" />
            <Kpi value={totalDue} label="Due" accent={totalDue > 0} />
          </KpiRow>

          <Actions>
            <Button kind="primary" onClick={() => setShowNewDeck(true)}>
              New deck
            </Button>
          </Actions>

          <Card mono="Decks" title="Your decks">
            {decks.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No decks yet"
                detail="Create a deck and start adding cards."
                actionLabel="Create a deck"
                onAction={() => setShowNewDeck(true)}
              />
            ) : (
              <List>
                {decks.map((deck) => {
                  const due = dueCount(deck)
                  return [
                    <Row
                      key={`${deck.id}-deck`}
                      title={deck.name}
                      meta={`${deck.cards.length} cards`}
                      value={
                        due > 0 ? (
                          <Tag accent>{due} due</Tag>
                        ) : (
                          <Tag>Up to date</Tag>
                        )
                      }
                      action={
                        <Actions>
                          <Button kind="secondary" onClick={() => startStudy(deck)} disabled={due === 0}>
                            Start study
                          </Button>
                          <Button kind="ghost" onClick={() => setAddingCardTo(deck.id)}>
                            Add card
                          </Button>
                          <Button kind="ghost" ariaLabel={`Delete ${deck.name}`} onClick={() => removeDeck(deck)}>
                            Delete
                          </Button>
                        </Actions>
                      }
                    />,
                    ...(study?.deckId === deck.id
                      ? []
                      : deck.cards.map((card) => {
                          const nextDue = new Date(card.dueDate + 'T00:00:00')
                          return (
                            <Row
                              key={`${deck.id}-${card.id}`}
                              title={card.front}
                              meta={card.back}
                              value={nextDue.toDateString()}
                            />
                          )
                        })),
                  ]
                })}
              </List>
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
              <Actions>
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
              </Actions>
            </Card>
          ) : null}

          {addingCardTo ? (
            <Card
              mono="New card"
              title={`Add card to ${decks.find((d) => d.id === addingCardTo)?.name ?? ''}`}
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
              <Actions>
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
              </Actions>
            </Card>
          ) : null}

          {study && sessionCard ? (
            <Card mono={`${study.index + 1} of ${study.cardIds.length}`} title="Study">
        <div aria-live="polite">
          <div className="fc-card-front">{sessionCard.front}</div>
          {study.revealed ? <div className="fc-card-back">{sessionCard.back}</div> : null}
        </div>
              {study.revealed ? (
                <Actions>
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
                </Actions>
              ) : (
                <Actions>
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
                </Actions>
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
              onAction={() => {
                setTab('Decks')
                setShowNewDeck(true)
              }}
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
    </AppShell>
  )
}
