// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useState } from 'react'
import { mulberry32, shuffle } from '@lacuna/random'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Select,
  Tabs,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import {
  questionStore,
  sessionStore,
  settingsStore,
  type Question,
  type QuestionType,
  type Session,
  type AnswerRecord,
} from './host'

const LETTERS = ['A', 'B', 'C', 'D'] as const

function optIndex(letter: string): number {
  const i = LETTERS.indexOf(letter as (typeof LETTERS)[number])
  return i === -1 ? 0 : i
}

function typeLabel(t: QuestionType): string {
  if (t === 'multiple-choice') return 'Multiple choice'
  if (t === 'text') return 'Text'
  return 'Number'
}

type Phase = 'idle' | 'session' | 'done'

export function App() {
  const [tab, setTab] = useState<'Questions' | 'Study'>('Questions')

  const [questions, setQuestions] = useState<Question[]>(() => questionStore.list())
  const [text, setText] = useState('')
  const [qType, setQType] = useState<QuestionType>('multiple-choice')
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [optC, setOptC] = useState('')
  const [optD, setOptD] = useState('')
  const [correct, setCorrect] = useState('A')
  const [formError, setFormError] = useState<string | null>(null)

  const [shuffleOptions, setShuffleOptions] = useState<boolean>(() => settingsStore.get().shuffleOptions)

  const [phase, setPhase] = useState<Phase>('idle')
  const [sessionOrder, setSessionOrder] = useState<Question[]>([])
  const [shuffled] = useState<string[]>([...LETTERS])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [reviewing, setReviewing] = useState(false)

  const [sessions, setSessions] = useState<Session[]>(() => sessionStore.list())

  useEffect(() => {
    settingsStore.set({ shuffleOptions })
  }, [shuffleOptions])

  const current = sessionOrder[index] ?? null
  const currentAnswer = answers[answers.length - 1] ?? null

  function resetDraft() {
    setText('')
    setQType('multiple-choice')
    setOptA('')
    setOptB('')
    setOptC('')
    setOptD('')
    setCorrect('A')
    setFormError(null)
  }

  function saveQuestion() {
    const t = text.trim()
    if (!t) {
      setFormError('Type the question text')
      return
    }
    if (qType === 'multiple-choice' && [optA, optB, optC, optD].some((o) => !o.trim())) {
      setFormError('Fill all four options')
      return
    }
    setFormError(null)
    const question: Question = {
      id: `q-${Date.now().toString(36)}`,
      text: t,
      type: qType,
      options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()] as [string, string, string, string],
      correct: LETTERS[optIndex(correct)] ?? 'A',
      createdAt: Date.now(),
    }
    questionStore.add(question)
    setQuestions(questionStore.list())
    resetDraft()
  }

  function deleteQuestion(id: string) {
    questionStore.remove(id)
    setQuestions(questionStore.list())
  }

  function startSession() {
    if (questions.length === 0) return
    const rng = mulberry32(Date.now())
    const order = shuffle(rng, questions)
    setSessionOrder(order)
    setIndex(0)
    setChosen(null)
    setTyped('')
    setAnswers([])
    setReviewing(false)
    setPhase('session')
  }

  function pick(letter: string) {
    if (!current || chosen !== null) return
    const ok = current.type === 'multiple-choice' ? letter === current.correct : true
    setChosen(letter)
    setAnswers((prev) => [...prev, { questionId: current.id, given: letter, correct: current.correct, ok }])
  }

  function submitTyped() {
    if (!current || chosen !== null) return
    const v = typed.trim()
    if (!v) return
    const expected = current.options[0].trim()
    const ok = current.type === 'number' ? Math.abs(Number(v) - Number(expected)) < 1e-9 : v === expected
    setChosen('TYPED')
    setAnswers((prev) => [...prev, { questionId: current.id, given: v, correct: current.correct, ok }])
  }

  function advance() {
    if (index + 1 >= sessionOrder.length) {
      setPhase('done')
      return
    }
    setIndex(index + 1)
    setChosen(null)
    setTyped('')
  }

  function endSession() {
    if (phase === 'done' && answers.length > 0 && sessionOrder.length > 0) {
      const score = answers.filter((a) => a.ok).length
      const session: Session = {
        id: `s-${Date.now().toString(36)}`,
        date: new Date().toISOString().slice(0, 10),
        score,
        total: sessionOrder.length,
        answers,
      }
      sessionStore.add(session)
      setSessions(sessionStore.list())
    }
    setPhase('idle')
    setReviewing(false)
  }

  function exportJson() {
    const payload = { version: 1, questions, sessions }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz-app-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const mistakes = reviewing
    ? answers
        .filter((a) => !a.ok)
        .map((a) => ({ ...a, question: sessionOrder.find((q) => q.id === a.questionId) ?? current }))
    : []

  const lastGood = sessions[sessions.length - 1] ?? null
  const sessionScore = answers.filter((a) => a.ok).length

  const chipCount = questions.length === 1 ? '1 question in the bank' : `${questions.length} questions in the bank`

  return (
    <AppShell
      name="Quiz App"
      icon="school"
      hue="teal"
      category="Productivity"
      meta={`${questions.length} question${questions.length === 1 ? '' : 's'}`}
      side={
        <Rail
          title="Session"
          note="Order and options are shuffled each run."
          chips={
            questions.length === 0
              ? ['Bank is empty']
              : [chipCount, `${sessions.length} session${sessions.length === 1 ? '' : 's'} run`]
          }
        />
      }
    >
      <Tabs items={['Questions', 'Study']} active={tab} onSelect={(v) => setTab(v as 'Questions' | 'Study')} />

      {tab === 'Questions' ? (
        <Card mono="New" title="Add a question">
          <FormGrid>
            <TextInput
              label="Question"
              value={text}
              onChange={setText}
              placeholder="What is 2+2?"
              error={formError ? formError : undefined}
            />
            <Select
              label="Type"
              value={qType}
              onChange={(v) => setQType(v as QuestionType)}
              options={[
                { value: 'multiple-choice', label: 'Multiple choice' },
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Number' },
              ]}
            />
            {qType === 'multiple-choice' ? (
              <>
                <TextInput label="Option A" value={optA} onChange={setOptA} />
                <TextInput label="Option B" value={optB} onChange={setOptB} />
                <TextInput label="Option C" value={optC} onChange={setOptC} />
                <TextInput label="Option D" value={optD} onChange={setOptD} />
                <Select
                  label="Correct answer"
                  value={correct}
                  onChange={setCorrect}
                  options={LETTERS.map((l) => ({ value: l, label: l }))}
                />
              </>
            ) : null}
            <Checkbox label="Shuffle option order in sessions" checked={shuffleOptions} onChange={setShuffleOptions} />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={saveQuestion}>Save question</Button>
            <Button kind="ghost" onClick={resetDraft}>Clear</Button>
          </Actions>
        </Card>
      ) : null}

      {tab === 'Questions' ? (
        <Card mono={`${questions.length} saved`} title="Question bank">
          {questions.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No questions yet"
              detail="Type a question above and press Save question."
              actionLabel="Clear form"
              onAction={resetDraft}
            />
          ) : (
            <List label="Questions">
              {questions.map((q) => (
                <Row
                  key={q.id}
                  title={q.text}
                  meta={<Tag>{typeLabel(q.type)}</Tag>}
                  value={`Answer ${q.correct}: ${q.options[optIndex(q.correct)] ?? ''}`}
                  action={
                    <Button kind="ghost" ariaLabel={`Delete ${q.text}`} onClick={() => deleteQuestion(q.id)}>
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      ) : null}

      {tab === 'Study' ? (
        phase === 'idle' ? (
          <Card mono="Ready" title="Study session">
            {questions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No questions ready"
                detail="Add a question on the Questions tab first."
                actionLabel="Add a question"
                onAction={() => setTab('Questions')}
              />
            ) : (
              <>
                <p style={{ margin: 0 }}>
                  {questions.length} question{questions.length === 1 ? '' : 's'} ready
                </p>
                <Actions>
                  <Button kind="primary" onClick={startSession}>Start session</Button>
                </Actions>
              </>
            )}
          </Card>
        ) : null
      ) : null}

      {tab === 'Study' && phase === 'session' && current ? (
        <Card mono={`${index + 1} of ${sessionOrder.length}`} title={current.text}>
          {current.type === 'multiple-choice' ? (
            chosen === null ? (
              <div style={{ display: 'grid', gap: 'calc(8px * var(--sf))' }}>
                {shuffled.map((letter) => {
                  const value = current.options[optIndex(letter)] ?? ''
                  const label = `${letter}: ${value}`
                  return (
                    <Button
                      key={letter}
                      kind="secondary"
                      onClick={() => pick(letter)}
                      style={{ display: 'block', textAlign: 'left' }}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            ) : null
          ) : (
            <FormGrid>
              <TextInput
                label={current.type === 'text' ? 'Your answer' : 'Your number'}
                value={typed}
                onChange={setTyped}
                placeholder={current.type === 'number' ? '42' : 'Type your answer'}
                inputMode={current.type === 'number' ? 'decimal' : undefined}
              />
            </FormGrid>
          )}
          <Actions>
            {current.type === 'multiple-choice' ? (
              <Button kind="primary" onClick={advance} disabled={chosen === null}>
                Next
              </Button>
            ) : (
              <Button kind="primary" onClick={submitTyped} disabled={typed.trim() === ''}>
                Submit
              </Button>
            )}
          </Actions>
          {chosen !== null && currentAnswer ? (
            <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
              <p style={{ margin: 0 }}>{currentAnswer.ok ? 'Correct' : 'Incorrect'}</p>
              {!currentAnswer.ok && current.type === 'multiple-choice' ? (
                <p style={{ margin: 'calc(4px * var(--sf)) 0 0' }}>
                  Correct answer: {current.correct}: {current.options[optIndex(current.correct)]}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'Study' && phase === 'done' ? (
        <Card mono="Result" title="Session summary">
          <KpiRow>
            <Kpi accent value={`${sessionScore}/${sessionOrder.length}`} label="Score" />
            <Kpi
              value={`${Math.round((sessionScore / Math.max(1, sessionOrder.length)) * 100)}%`}
              label="Accuracy"
            />
          </KpiRow>
          <p style={{ margin: 'calc(8px * var(--sf)) 0 0' }}>
            Score: {sessionScore}/{sessionOrder.length}
          </p>
          <Actions>
            <Button kind="primary" onClick={() => setReviewing(true)}>Review mistakes</Button>
            <Button kind="secondary" onClick={endSession}>Done</Button>
          </Actions>
        </Card>
      ) : null}

      {tab === 'Study' && phase === 'done' && reviewing ? (
        <Card mono="Mistakes" title="Review mistakes">
          {mistakes.length === 0 ? (
            <EmptyState
              mono="Clean"
              title="No mistakes"
              detail="Every answer in this session was correct."
              actionLabel="Done"
              onAction={endSession}
            />
          ) : (
            <List label="Mistakes">
              {mistakes.map((m) => {
                const given = `Your answer: ${m.given}${
                  m.question?.type === 'multiple-choice' ? `: ${m.question.options[optIndex(m.given)]}` : ''
                }`
                const correct = `Answer ${m.correct}${
                  m.question?.type === 'multiple-choice' ? `: ${m.question.options[optIndex(m.correct)]}` : ''
                }`
                return (
                  <li
                    key={m.questionId}
                    className="lk-row hot"
                    aria-label={`${m.question?.text ?? ''} ${given} ${correct}`}
                  >
                    <span className="lk-row-text">
                      <span className="lk-row-title">{m.question?.text ?? ''}</span>
                      <span className="lk-row-meta">{given}</span>
                    </span>
                    <span className="lk-row-value">{correct}</span>
                  </li>
                )
              })}
            </List>
          )}
        </Card>
      ) : null}

      <Card mono={sessions.length === 0 ? 'None yet' : `${sessions.length} total`} title="Session history">
        {sessions.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No sessions yet"
            detail={
              questions.length === 0
                ? 'Add questions on the Questions tab, then run a session.'
                : 'Use Start session above to record your first session.'
            }
            actionLabel="Clear history"
            onAction={() => {
              sessionStore.clear()
              setSessions([])
            }}
          />
        ) : (
          <>
            <Table
              label="Sessions"
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'score', label: 'Score', num: true },
                { key: 'accuracy', label: 'Accuracy', num: true },
                { key: 'mistakes', label: 'Mistakes', num: true },
              ]}
              rows={sessions
                .slice(0, 10)
                .reverse()
                .map((s) => ({
                  cells: {
                    date: s.date,
                    score: `${s.score}/${s.total}`,
                    accuracy: `${Math.round((s.score / Math.max(1, s.total)) * 100)}%`,
                    mistakes: `${s.total - s.score}`,
                  },
                }))}
            />
            <Actions>
              <Button kind="secondary" onClick={exportJson}>
                Export backup
              </Button>
              {lastGood ? <Tag accent>Last: {lastGood.score}/{lastGood.total}</Tag> : null}
            </Actions>
          </>
        )}
      </Card>
    </AppShell>
  )
}
