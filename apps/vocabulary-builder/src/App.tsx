import { useState } from 'react'
import { newCard, reviewCard, type Grade } from '@lacuna/spaced-repetition'
import { useClipboard } from '@lacuna/use-clipboard'
import { toCsv } from '@lacuna/csv-parse'
import { AppShell, Card, Body, Button, EmptyState, Stack, Title } from '@lacuna/ui'
import { wordStore, type Word } from './host'

type Tab = 'deck' | 'study'

function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function App() {
  const [tab, setTab] = useState<Tab>('deck')
  const [deck, setDeck] = useState<Word[]>(() => wordStore().list())
  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [flash, setFlash] = useState('')
  const [flashTimer, setFlashTimer] = useState(0)
  const [session, setSession] = useState<Word[]>(() => deck.filter((w) => w.dueDate <= today()))

  const notify = (message: string) => {
    setFlash(message)
    window.clearTimeout(flashTimer)
    setFlashTimer(window.setTimeout(() => setFlash(''), 2000))
  }

  const clipboard = useClipboard({
    timeoutMs: 2000,
    onSuccess: () => notify('Deck copied as CSV.'),
    onError: () => notify('Could not copy the deck.'),
  })

  const dueCount = session.length
  const current = session[0] ?? null

  const save = (next: Word[]) => {
    wordStore().replaceAll(next)
    setDeck(next)
  }

  const startSession = () => {
    setSession(deck.filter((w) => w.dueDate <= today()))
    setFlipped(false)
  }

  const addWord = () => {
    const word = newWord.trim()
    const definition = newDef.trim()
    if (!word) {
      notify('Enter a word first.')
      return
    }
    const card = newCard(word, today())
    save([...deck, { ...card, word, definition }])
    setNewWord('')
    setNewDef('')
  }

  const removeWord = (id: string) => {
    save(deck.filter((w) => w.id !== id))
  }

  const grade = (g: Grade) => {
    if (!current) return
    const result = reviewCard(current, g, today())
    // "Again" keeps the word due today (stays in the session); "Good" moves it
    // to a future date (leaves the session).
    save(deck.map((w): Word => (w.id === current.id ? { ...w, ...result.card } : w)))
    setSession((prev) => prev.filter((w) => w.id !== current.id))
    setFlipped(false)
  }

  const exportCsv = async () => {
    const rows: string[][] = [['word', 'definition'], ...deck.map((w) => [w.word, w.definition])]
    await clipboard.copy(toCsv(rows))
  }

  return (
    <AppShell name="Vocabulary Builder" icon="notes" hue="brown" category="Learning" meta={deck.length > 0 ? `${deck.length} words` : undefined}>
      <main style={{ display: 'grid', gap: 16 }}>
        <div role="tablist" style={{ display: 'flex', gap: 8 }}>
          <button
            role="tab"
            aria-selected={tab === 'deck'}
            className="lc-chip"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setTab('deck')
              setFlipped(false)
            }}
          >
            Deck
          </button>
          <button
            role="tab"
            aria-selected={tab === 'study'}
            className="lc-chip"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setTab('study')
              startSession()
            }}
          >
            Study
          </button>
        </div>

        {tab === 'deck' && (
          <>
            <Card title="Add a word">
              <Stack>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    aria-label="Word"
                    className="lc-input"
                    placeholder="e.g. serendipity"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addWord()
                    }}
                  />
                  <input
                    aria-label="Definition"
                    className="lc-input"
                    placeholder="e.g. a pleasant surprise"
                    value={newDef}
                    onChange={(e) => setNewDef(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addWord()
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button kind="primary" onClick={addWord}>
                    Add word
                  </Button>
                  <Button kind="ghost" onClick={exportCsv}>
                    Export CSV
                  </Button>
                </div>
                <div aria-live="polite">
                  <Body sm>{flash}</Body>
                </div>
              </Stack>
            </Card>

            <Card title="Deck" mono={deck.length > 0 ? `${dueCount} due` : undefined}>
              {deck.length === 0 ? (
                <EmptyState title="Your deck is empty" detail="Add your first word to start building." actionLabel="Add a word above" />
              ) : (
                <ul className="lc-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                  {deck.map((w) => (
                    <li key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>{w.word}</div>
                        <div>{w.definition}</div>
                      </div>
                      <Button kind="ghost" onClick={() => removeWord(w.id)}>
                        Delete {w.word}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {tab === 'study' && current && (
          <Card title="Review" mono={session.length > 1 ? `${session.length} in session` : undefined}>
            <Stack>
              <div aria-live="polite" style={{ display: 'grid', gap: 8 }}>
                <Title size="md">{flipped ? current.definition : current.word}</Title>
                {flipped && <Body sm>{current.word}</Body>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!flipped ? (
                  <Button kind="primary" onClick={() => setFlipped(true)}>
                    Flip
                  </Button>
                ) : (
                  <>
                    <Button kind="danger" onClick={() => grade(0)}>
                      Again
                    </Button>
                    <Button kind="primary" onClick={() => grade(2)}>
                      Good
                    </Button>
                  </>
                )}
              </div>
            </Stack>
          </Card>
        )}

        {tab === 'study' && !current && (
          <Card title="Review">
            <EmptyState
              title="Session complete"
              detail="Everything due has been reviewed."
              actionLabel="Review due"
              onAction={startSession}
            />
          </Card>
        )}

        {tab === 'study' && (
          <div aria-live="polite">
            <Body sm>
              {dueCount === 0 ? 'No cards due' : `${dueCount} card${dueCount === 1 ? '' : 's'} due`}
            </Body>
          </div>
        )}
      </main>
    </AppShell>
  )
}
