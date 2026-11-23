import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import {
  DIFFICULTIES,
  historyStore,
  settingsStore,
  type Difficulty,
  type HistoryEntry,
} from './host/mock'

const OPERATIONS = ['Addition', 'Subtraction', 'Multiplication', 'Division']
type Operation = (typeof OPERATIONS)[number]
type Tab = 'Generate' | 'Study' | 'Results' | 'History' | 'Settings'

const TABS: Tab[] = ['Generate', 'Study', 'Results', 'History', 'Settings']

interface Question {
  a: number
  b: number
  text: string
}

interface Answer {
  value: string
  checked: boolean
  correct: boolean | null
}

const OPERATION_SYMBOL: Record<Operation, string> = {
  Addition: '+',
  Subtraction: '-',
  Multiplication: '×',
  Division: '÷',
}

function operandsFor(difficulty: Difficulty, operation: Operation): [number, number] {
  let lo = operation === 'Addition' || operation === 'Subtraction' ? 1 : 2
  let hi = 10
  if (difficulty === 'Medium') {
    lo = 5
    hi = 25
  } else if (difficulty === 'Hard') {
    lo = 21
    hi = 100
  }
  if (operation === 'Subtraction' && difficulty === 'Easy') hi = 12
  let a = Math.floor(Math.random() * (hi - lo + 1)) + lo
  let b = Math.floor(Math.random() * (hi - lo + 1)) + lo
  if (operation === 'Subtraction' && b > a) {
    const t = a
    a = b
    b = t
  }
  if (operation === 'Division') {
    b = Math.floor(Math.random() * 9) + 2
    a = b * (Math.floor(Math.random() * 9) + 2)
  }
  return [a, b]
}

function buildQuestion(difficulty: Difficulty, operation: Operation): Question {
  const [a, b] = operandsFor(difficulty, operation)
  return { a, b, text: `${a} ${OPERATION_SYMBOL[operation]} ${b} =` }
}

function correctAnswer(q: Question, operation: Operation): number {
  switch (operation) {
    case 'Addition':
      return q.a + q.b
    case 'Subtraction':
      return q.a - q.b
    case 'Multiplication':
      return q.a * q.b
    case 'Division':
      return q.a / q.b
    default:
      return 0
  }
}

function AppTabs({ active, disabled, onSelect }: { active: Tab; disabled: Tab[]; onSelect: (t: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Math Practice sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {TABS.map((t) => {
        const off = disabled.includes(t)
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active === t}
            aria-disabled={off}
            onClick={() => {
              if (!off) onSelect(t)
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--line, transparent)',
              background: active === t ? 'var(--accent, transparent)' : 'transparent',
              color: active === t ? 'var(--on-accent, inherit)' : 'inherit',
              cursor: off ? 'not-allowed' : 'pointer',
              opacity: off ? 0.5 : 1,
              fontFamily: 'inherit',
              fontSize: '0.9rem',
            }}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('Generate')
  const [operation, setOperation] = useState<Operation>('Addition')
  const [count, setCount] = useState('5')
  const [difficulty, setDifficulty] = useState<Difficulty>(() => settingsStore.get().difficulty)

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [history, setHistory] = useState<HistoryEntry[]>(() => historyStore.list())
  const [printMode, setPrintMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const answeredCount = Object.values(answers).filter((a) => a.checked).length
  const sessionComplete = questions.length > 0 && answeredCount === questions.length
  const disabledTabs = !sessionComplete ? (['Results'] as Tab[]) : []

  function generate() {
    const n = Math.max(1, Math.min(50, Math.trunc(Number(count)) || 5))
    const next: Question[] = []
    const seen = new Set<string>()
    let attempts = 0
    while (next.length < n && attempts < 1000) {
      const q = buildQuestion(difficulty, operation)
      if (!seen.has(q.text)) {
        seen.add(q.text)
        next.push(q)
      }
      attempts += 1
    }
    setQuestions(next)
    setAnswers({})
    setPrintMode(false)
    setCurrentIndex(0)
  }

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [index]: { value, checked: prev[index]?.checked ?? false, correct: prev[index]?.correct ?? null },
    }))
  }

  function check(index: number) {
    const q = questions[index]
    if (!q) return
    setAnswers((prev) => {
      const existing = prev[index] ?? { value: '', checked: false, correct: null }
      const correct = Number(existing.value) === correctAnswer(q, operation)
      const next = { ...prev, [index]: { value: existing.value, checked: true, correct } }
      const checkedCount = Object.values(next).filter((a) => a.checked).length
      if (checkedCount === questions.length) {
        const score = questions.filter((_, i) => next[i]?.correct).length
        const entry: HistoryEntry = {
          id: `${Date.now()}`,
          date: new Date().toISOString(),
          count: questions.length,
          score,
        }
        setHistory((hist) => {
          const updated = [entry, ...hist]
          historyStore.replaceAll(updated)
          return updated
        })
      }
      return next
    })
  }

  function advance() {
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))
  }

  function removeEntry(id: string) {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id)
      historyStore.replaceAll(next)
      return next
    })
  }

  function changeDifficulty(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty)
    settingsStore.set({ difficulty: nextDifficulty })
  }

  function dateLabel(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const correctCount = questions.filter((_, i) => answers[i]?.correct).length

  const resultRows = questions.map((q, i) => {
    const a = answers[i]
    return {
      cells: {
        q: q.text,
        ans: a ? a.value : '',
        status: a?.correct ? 'Correct' : 'Incorrect',
      },
    }
  })

  return (
    <AppShell
      name="Math Practice"
      icon="school"
      hue="rust"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'session' : 'sessions'}`}
    >
      <AppTabs active={tab} disabled={disabledTabs} onSelect={setTab} />

      {tab === 'Generate' && (
        <Stack>
          <Card mono="Set up" title="New practice set">
            <FormGrid>
              <Select
                label="Operations"
                value={operation}
                onChange={(v) => setOperation(v as Operation)}
                options={[...OPERATIONS]}
              />
              <TextInput
                label="Count"
                type="number"
                value={count}
                onChange={setCount}
                placeholder="5"
              />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={generate}>Generate</PrimaryButton>
            </Actions>
          </Card>

          <Card
            mono="Preview"
            title="Generated questions"
            actions={
              questions.length > 0 ? (
                <Button kind="secondary" onClick={() => setPrintMode(true)}>
                  Print Sheet
                </Button>
              ) : undefined
            }
          >
            {questions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No questions yet"
                detail="Set the operation and count, then click Generate."
                actionLabel="Generate a set"
              />
            ) : printMode ? null : (
              <List label="Questions">
                {questions.map((q, i) => (
                  <Row key={i} title={q.text} />
                ))}
              </List>
            )}
          </Card>

          {printMode && (
            <Card mono="Print" title="Print sheet">
              <Stack>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Math Practice</div>
                <List label="Questions to print">
                  {questions.map((q, i) => (
                    <Row key={i} title={q.text} />
                  ))}
                </List>
                <Actions>
                  <PrimaryButton onClick={() => window.print()}>Print</PrimaryButton>
                  <Button kind="ghost" onClick={() => setPrintMode(false)}>
                    Close
                  </Button>
                </Actions>
              </Stack>
            </Card>
          )}
        </Stack>
      )}

      {tab === 'Study' && (
        <Stack>
          <Card
            mono={questions.length > 0 ? `${answeredCount} of ${questions.length} answered` : 'Session'}
            title="Study session"
          >
            {questions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="Nothing to study"
                detail="Generate a set of questions from the Generate tab."
                actionLabel="Generate first"
              />
            ) : (
              <Stack style={{ gap: '10px' }}>
                <List label="Questions">
                  {questions.map((q, i) => (
                    <li key={i} style={{ margin: 0 }}>
                      {q.text}
                    </li>
                  ))}
                </List>
                <Stack style={{ gap: '10px' }}>
                  {questions.slice(0, currentIndex + 1).map((q, i) => {
                    const a = answers[i]
                    const isCurrent = i === currentIndex
                    const checked = a?.checked && a.correct != null
                    return (
                      <Card key={i} mono={`Question ${i + 1}`} title={q.text}>
                        <FormGrid>
                          <TextInput
                            label="Answer"
                            type="number"
                            value={a?.value ?? ''}
                            onChange={(v) => setAnswer(i, v)}
                            placeholder="Your answer"
                          />
                        </FormGrid>
                        {checked && (
                          <div role="status" style={{ fontWeight: 600 }}>
                            {a.correct ? 'Correct' : 'Incorrect'}
                          </div>
                        )}
                        {isCurrent && (
                          <Actions>
                            <PrimaryButton onClick={() => check(i)}>Check</PrimaryButton>
                            <Button kind="secondary" onClick={() => advance()}>
                              Next
                            </Button>
                          </Actions>
                        )}
                      </Card>
                    )
                  })}
                </Stack>
                {sessionComplete && (
                  <List label="Session record">
                    <Row
                      title={dateLabel(new Date().toISOString())}
                      meta={`${questions.length} questions`}
                      value={`${correctCount}/${questions.length}`}
                      action={
                        <Button kind="ghost" ariaLabel="Delete session" onClick={() => {}}>
                          Delete
                        </Button>
                      }
                    />
                  </List>
                )}
              </Stack>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'Results' && (
        <Stack>
          <Card mono="Summary" title="Results">
            {questions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No results yet"
                detail="Complete a study session to see results."
                actionLabel="Start a session"
              />
            ) : (
              <Stack>
                <div style={{ fontWeight: 600 }}>
                  Score: {correctCount}/{questions.length}
                </div>
                <Table
                  label="Question results"
                  columns={[
                    { key: 'q', label: 'Question' },
                    { key: 'ans', label: 'Answer' },
                    { key: 'status', label: 'Status' },
                  ]}
                  rows={resultRows}
                />
              </Stack>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'History' && (
        <Stack>
          <Card
            mono={`${history.length} ${history.length === 1 ? 'entry' : 'entries'}`}
            title="Session history"
          >
            {history.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No sessions yet"
                detail="Complete a study session and it will appear here."
                actionLabel="Complete a session"
              />
            ) : (
              <List label="Sessions">
                {history.map((e) => (
                  <Row
                    key={e.id}
                    title={dateLabel(e.date)}
                    meta={`${e.count} questions`}
                    value={`${e.score}/${e.count}`}
                    action={
                      <Button kind="ghost" ariaLabel="Delete session" onClick={() => removeEntry(e.id)}>
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'Settings' && (
        <Stack>
          <Card mono="Preferences" title="Difficulty">
            <FormGrid>
              <Select
                label="Difficulty"
                value={difficulty}
                onChange={(v) => changeDifficulty(v as Difficulty)}
                options={[...DIFFICULTIES]}
              />
            </FormGrid>
            <p style={{ color: 'var(--ink-60)', fontSize: '0.85rem', margin: 0 }}>
              Easy keeps operands at or below 10. Hard pushes them above 20.
            </p>
          </Card>
        </Stack>
      )}
    </AppShell>
  )
}
