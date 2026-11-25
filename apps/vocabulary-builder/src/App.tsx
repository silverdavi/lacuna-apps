import { useMemo, useRef, useState } from 'react'
import { newCard, reviewCard, type Grade } from '@lacuna/spaced-repetition'
import { useClipboard } from '@lacuna/use-clipboard'
import { parseCsv, toCsv } from '@lacuna/csv-parse'
import { AppShell, Button, Card, EmptyState, Kpi, KpiRow, List, MonoLabel, Rail, Row, Stack, TextInput, Title } from '@lacuna/ui'
import { wordStore, type Word } from './host'

type Tab = 'deck' | 'study'

function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
  const fileRef = useRef<HTMLInputElement>(null)

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

  const stats = useMemo(() => {
    const due = deck.filter((w) => w.dueDate <= today()).length
    return { total: deck.length, due, learning: Math.max(0, deck.length - due) }
  }, [deck])

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
    save(deck.map((w): Word => (w.id === current.id ? { ...w, ...result.card } : w)))
    setSession((prev) => prev.filter((w) => w.id !== current.id))
    setFlipped(false)
  }

  const exportCsv = async () => {
    const rows: string[][] = [['word', 'definition'], ...deck.map((w) => [w.word, w.definition])]
    await clipboard.copy(toCsv(rows))
  }

  const importCsv = (file: File) => {
    file.text().then((text) => {
      const { rows } = parseCsv(text, { header: true })
      const seen = new Set(deck.map((w) => w.word.toLowerCase()))
      const added: Word[] = []
      for (const row of rows) {
        const word = (row[0] ?? '').trim()
        const definition = (row[1] ?? '').trim()
        if (!word || !definition || seen.has(word.toLowerCase())) continue
        seen.add(word.toLowerCase())
        added.push({ ...newCard(word, today()), word, definition })
      }
      if (added.length > 0) {
        save([...deck, ...added])
        notify(`Imported ${added.length} word${added.length === 1 ? '' : 's'}.`)
      } else {
        notify('No new words found in that file.')
      }
    })
  }

  const onImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) importCsv(file)
    event.target.value = ''
  }

  return (
    <AppShell
      name="Vocabulary Builder"
      icon="notes"
      hue="brown"
      category="Learning"
      meta={deck.length > 0 ? `${deck.length} words` : undefined}
      status={flash || undefined}
      side={
        <Rail title="Deck" note={deck.length === 0 ? 'Empty' : `${stats.due} due today`} chips={deck.length === 0 ? [] : [`${stats.learning} learning`]}>
          <Stack>
            <KpiRow>
              <Kpi value={stats.total} label="Words" />
              <Kpi value={stats.due} label="Due" accent={stats.due > 0} />
              <Kpi value={stats.learning} label="Learning" />
            </KpiRow>
            <Stack>
              <Button kind="secondary" onClick={() => fileRef.current?.click()} disabled={deck.length === 0}>
                Import CSV
              </Button>
            </Stack>
          </Stack>
        </Rail>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
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
          <Card title="Add a word">
            <Stack>
              <TextInput
                label="Word"
                placeholder="e.g. serendipity"
                value={newWord}
                onChange={setNewWord}
                inputMode="text"
              />
              <TextInput
                label="Definition"
                placeholder="e.g. a pleasant surprise"
                value={newDef}
                onChange={setNewDef}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button kind="primary" onClick={addWord}>
                  Add word
                </Button>
                <Button kind="ghost" onClick={exportCsv} disabled={deck.length === 0}>
                  Export CSV
                </Button>
              </div>
              <div aria-live="polite">
                {flash ? <MonoLabel accent>{flash}</MonoLabel> : null}
              </div>
            </Stack>
          </Card>
        )}

        {tab === 'deck' && (
          <Card title="Deck" mono={deck.length > 0 ? `${stats.due} due` : undefined}>
            {deck.length === 0 ? (
              <EmptyState
                title="Your deck is empty"
                detail="Add your first word to start building."
                actionLabel="Add a word above"
              />
            ) : (
              <List label="Deck">
                {deck.map((w) => (
                  <Row
                    key={w.id}
                    title={w.word}
                    meta={w.definition}
                    value={fmtDate(w.dueDate)}
                    action={
                      <Button kind="ghost" onClick={() => removeWord(w.id)}>
                        Delete {w.word}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        )}

        {tab === 'study' && current && (
          <Card title="Review" mono={session.length > 1 ? `${session.length} in session` : undefined}>
            <Stack>
              <div aria-live="polite" style={{ display: 'grid', gap: 8 }}>
                <Title size="md">{flipped ? current.definition : current.word}</Title>
                {flipped ? <MonoLabel faint>{current.word}</MonoLabel> : null}
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
            <MonoLabel faint>
              {session.length === 0 ? 'No cards due' : `${session.length} card${session.length === 1 ? '' : 's'} due`}
            </MonoLabel>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }} onChange={onImportFile} />
      </div>
    </AppShell>
  )
}
