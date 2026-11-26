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
  Select,
  Stack,
  Table,
  Tag,
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



export function App() {
  const [tab, setTab] = useState<Tab>('Generate')
  const [operation, setOperation] = useState<Operation>('Addition')
  const [count, setCount] = useState('5')
  const [difficulty, setDifficulty] = useState<Difficulty>(() => settingsStore.get().difficulty)

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [history, setHistory] = useState<HistoryEntry[]>(() => historyStore.list())
  const [lastChecked, setLastChecked] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // The Study panel walks question 1..N in order, showing exactly one
  // question's answer box at a time. Each "Check" records the status for the
  // current question and advances to the next. The session is complete once
  // every question has been checked.
  const currentIndex = (() => {
    for (let i = 0; i < questions.length; i += 1) {
      if (!answers[i]?.checked) return i
    }
    return questions.length - 1
  })()
  const sessionComplete = questions.length > 0 && Object.values(answers).filter((a) => a.checked).length === questions.length
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
      setLastChecked(null)
      setTab('Generate')
  }

  function setAnswer(value: string) {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: { value, checked: false, correct: null },
    }))
  }

  function check() {
    const q = questions[currentIndex]
    if (!q) return
    const idx = currentIndex
    setAnswers((prev) => {
      const existing = prev[idx] ?? { value: '', checked: false, correct: null }
      const correct = Number(existing.value) === correctAnswer(q, operation)
      const next = { ...prev, [idx]: { value: existing.value, checked: true, correct } }
      if (idx === questions.length - 1) {
        const score = Object.values(next).filter((a) => a.correct).length
        const entry: HistoryEntry = {
          id: `${Date.now()}`,
          date: new Date().toISOString(),
          count: questions.length,
          score,
        }
        const updated = [entry, ...history]
        historyStore.replaceAll(updated)
        setHistory(updated)
      }
      return next
    })
    setLastChecked(idx)
  }

  function removeEntry(id: string) {
    const next = history.filter((e) => e.id !== id)
    setHistory(next)
    historyStore.replaceAll(next)
  }

  function changeDifficulty(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty)
    settingsStore.set({ difficulty: nextDifficulty })
  }

  function dateLabel(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function openPrintSheet() {
    const qs = questions.map((q) => `<li>${q.text}</li>`).join('')
    const html = `<html><head><meta charset="utf-8"><title>Math Practice</title></head><body><h1>Math Practice</h1><ul>${qs}</ul></body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
    }
  }

  function copyQuestions() {
    const text = questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => undefined,
    )
  }

  function exportHistory() {
    if (history.length === 0) return
    const lines = ['date,questions,score', ...history.map((e) => `${e.date},${e.count},${e.score}`)]
    void navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => undefined,
    )
  }

  const resultRows = questions.map((q, i) => {
    const a = answers[i]
    const answered = Boolean(a?.checked)
    const correct = answered && Boolean(a?.correct)
    const shown = answered ? (a.value !== '' ? a.value : String(correctAnswer(q, operation))) : ''
    return {
      cells: {
        q: q.text,
        ans: shown,
        status: answered ? (correct ? 'Correct' : 'Incorrect') : '',
      },
    }
  })

  const answered = Object.values(answers).filter((a) => a.checked).length
  const correctCount = Object.values(answers).filter((a) => a.correct).length

  return (
    <AppShell
      name="Math Practice"
      icon="school"
      hue="rust"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'session' : 'sessions'}`}
      status={
        sessionComplete && questions.length > 0
          ? `Session complete · score ${correctCount}/${questions.length}`
          : questions.length > 0
            ? `Question ${Math.min(currentIndex + 1, questions.length)} of ${questions.length}`
            : 'No active set'
      }
      side={
        <Rail
          title="Session"
          note={questions.length > 0 ? `${answered}/${questions.length} answered` : 'Not started'}
          chips={[...TABS]}
        >
          <KpiRow>
            <Kpi value={questions.length} label="Questions" />
            <Kpi value={`${correctCount}`} label="Correct" accent />
            <Kpi value={history.length} label="Sessions" />
          </KpiRow>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag>{difficulty}</Tag>
            <Tag>{operation}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button kind="ghost" ariaLabel="Copy questions" disabled={questions.length === 0} onClick={copyQuestions}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button kind="ghost" ariaLabel="Export history" disabled={history.length === 0} onClick={exportHistory}>
              Export
            </Button>
          </div>
        </Rail>
      }
    >
      <div
        role="tablist"
        aria-label="Math Practice sections"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}
      >
        {TABS.map((t) => {
          const off = disabledTabs.includes(t)
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-disabled={off}
              onClick={() => {
                if (!off) setTab(t)
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--line, transparent)',
                background: tab === t ? 'var(--accent, transparent)' : 'transparent',
                color: tab === t ? 'var(--on-accent, inherit)' : 'inherit',
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

      <Stack>
        {(tab === 'Generate' || tab === 'Settings') && (
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
              <Button kind="primary" onClick={generate}>Generate</Button>
            </Actions>
          </Card>
        )}

        {tab === 'Generate' && (
          <Card
            mono="Preview"
            title="Generated questions"
            actions={
              questions.length > 0 ? (
                <Button kind="secondary" onClick={openPrintSheet}>
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
            ) : (
              <List label="Questions">
                {questions.map((q, i) => (
                  <Row key={i} title={q.text} />
                ))}
              </List>
            )}
          </Card>
        )}

        {tab === 'Study' && (
          <Card
            mono={questions.length > 0 ? 'Study session' : 'Session'}
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
                <Card mono={`Question ${currentIndex + 1}`} title={questions[currentIndex].text}>
                  <FormGrid>
                    <TextInput
                      label="Answer"
                      type="number"
                      value={answers[currentIndex]?.value ?? ''}
                      onChange={setAnswer}
                      placeholder="Your answer"
                    />
                  </FormGrid>
                  {lastChecked != null && answers[lastChecked]?.checked && answers[lastChecked]?.correct != null && (
                    <div role="status" style={{ fontWeight: 600 }}>
                      {answers[lastChecked].correct ? 'Correct' : 'Incorrect'}
                    </div>
                  )}
                  <Actions>
                    <Button kind="primary" onClick={check}>Check</Button>
                  </Actions>
                </Card>
              </Stack>
            )}
          </Card>
        )}

        {tab === 'Results' && (
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
                  Score: {Object.values(answers).filter((a) => a.correct).length}/{questions.length}
                </div>
                <List label="Questions">
                  {questions.map((q, i) => (
                    <li key={i} style={{ margin: 0 }}>
                      {q.text}
                    </li>
                  ))}
                </List>
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
        )}

        {tab === 'History' && (
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
                  <li key={e.id}>
                    {dateLabel(e.date)} {e.count} questions {e.score}/{e.count}{' '}
                    <Button kind="ghost" ariaLabel="Delete session" onClick={() => removeEntry(e.id)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </List>
            )}
          </Card>
        )}

        {tab === 'Settings' && (
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
        )}
      </Stack>
    </AppShell>
  )
}
