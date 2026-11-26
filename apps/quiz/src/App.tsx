import { useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, Checkbox, EmptyState, ErrorState, FormGrid, Kpi, KpiRow, List, MonoLabel, PrimaryButton, Rail, Row, Stack, Table, TextInput } from '@lacuna/ui'
import { checkAnswer, createSession, scoreSession, type AnswerResult, type ChoiceQuestion, type QuizSession } from '@lacuna/quiz-engine'
import { openFile, saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { mulberry32, shuffle } from '@lacuna/random'
import { bankToText, parseBank, questionStore, sessionStore, settingsStore, type QuizQuestion, type QuizSettings, type SessionRecord } from './host'

function formatDate(value: number): string {
  const d = new Date(value)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

interface ActiveSession {
  session: QuizSession
  order: string[][]
  index: number
  selected: string | null
  results: AnswerResult[]
  finished?: boolean
}

export function App() {
  const [tab, setTab] = useState('Questions')
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => questionStore.list())
  const [sessions, setSessions] = useState<SessionRecord[]>(() => sessionStore.list())
  const [settings, setSettings] = useState<QuizSettings>(() => settingsStore.get())

  const [prompt, setPrompt] = useState('')
  const [correct, setCorrect] = useState('')
  const [wrong1, setWrong1] = useState('')
  const [wrong2, setWrong2] = useState('')
  const [promptError, setPromptError] = useState<string | null>(null)
  const [answersError, setAnswersError] = useState<string | null>(null)

  const [bankText, setBankText] = useState('')
  const [bankError, setBankError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)

  const [active, setActive] = useState<ActiveSession | null>(null)
  const [finishedScore, setFinishedScore] = useState<{ correct: number; total: number } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1800 })

  function refreshQuestions() {
    setQuestions(questionStore.list())
  }

  function refreshSessions() {
    setSessions(sessionStore.list())
  }

  function addQuestion() {
    const p = prompt.trim()
    const c = correct.trim()
    const w1 = wrong1.trim()
    const w2 = wrong2.trim()
    if (!p) {
      setPromptError('Enter the question text')
      setAnswersError(null)
      return
    }
    if (!c || !w1 || !w2) {
      setPromptError(null)
      setAnswersError('Enter all three answers')
      return
    }
    if (new Set([c, w1, w2]).size !== 3) {
      setPromptError(null)
      setAnswersError('The three answers must all be different')
      return
    }
    questionStore.add({ prompt: p, correct: c, wrong: [w1, w2] })
    setPrompt('')
    setCorrect('')
    setWrong1('')
    setWrong2('')
    setPromptError(null)
    setAnswersError(null)
    refreshQuestions()
  }

  function deleteQuestion(id: string) {
    questionStore.remove(id)
    refreshQuestions()
  }

  function exportBank() {
    saveText(bankToText(questions), { filename: 'quiz-bank.json', mimeType: 'application/json' })
  }

  function copyBank() {
    void copy(bankToText(questions))
  }

  function importFromText() {
    try {
      const parsed = parseBank(bankText)
      const existing = new Set(questions.map((q) => q.prompt))
      const fresh = parsed.filter((q) => !existing.has(q.prompt))
      if (fresh.length === 0) {
        setBankError('All of these questions are already in the bank')
        setImportResult(null)
        return
      }
      questionStore.importAll(fresh)
      setBankText('')
      setBankError(null)
      setImportResult(`Added ${fresh.length} ${fresh.length === 1 ? 'question' : 'questions'} to the bank`)
      refreshQuestions()
    } catch (err) {
      setImportResult(null)
      setBankError(err instanceof Error ? err.message : 'Could not read that bank file')
    }
  }

  async function openBankFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const result = await openFile(file, 'text')
      if (result.ok && typeof result.data === 'string') {
        setBankText(result.data)
        setBankError(null)
        setImportResult(null)
      } else if (!result.ok) {
        setBankError(result.error)
      }
    }
    event.target.value = ''
  }

  function startSession() {
    if (questions.length === 0) return
    const bank = questions.map((q) => toEngineQuestion(q, settings.shuffleAnswers))
    setActive({
      session: createSession(bank, Date.now() % 1_000_000),
      order: bank.map((q) => q.options),
      index: 0,
      selected: null,
      results: [],
    })
    setFinishedScore(null)
  }

  function pick(option: string) {
    if (!active || active.selected !== null) return
    const question = active.session.questions[active.index]
    if (!question) return
    setActive({
      ...active,
      selected: option,
      results: [...active.results, { questionId: question.id, correct: checkAnswer(question, option), given: option }],
    })
  }

  function next() {
    if (!active) return
    if (active.index + 1 < active.session.questions.length) {
      setActive({ ...active, index: active.index + 1, selected: null })
      return
    }
    const score = scoreSession(active.session, active.results)
    const record: Omit<SessionRecord, 'id'> = {
      startedAt: Date.now(),
      total: score.total,
      correct: score.correct,
      items: active.session.questions.map((q, i) => ({
        prompt: q.prompt,
        correct: q.type === 'choice' ? q.options[q.correctIndex] : q.type === 'text' ? q.correctAnswer : String(q.correctValue),
        given: active.results[i] ? String(active.results[i].given) : '',
        right: active.results[i]?.correct ?? false,
      })),
    }
    sessionStore.add(record)
    setActive({ ...active, finished: true })
    setFinishedScore({ correct: score.correct, total: score.total })
    refreshSessions()
  }

  const currentQuestion = active ? active.session.questions[active.index] : undefined
  const currentOptions = active ? active.order[active.index] : undefined
  const answered = active !== null && active.selected !== null
  const wasCorrect = active !== null && active.results[active.index]?.correct === true
  const latest = sessions[0]

  const correctAnswerFor = (q: ChoiceQuestion) => q.options[q.correctIndex]

  const questionCard = (
    <Card mono="New" title="Add a question" actions={<Button kind="ghost" ariaLabel="Copy bank as JSON" onClick={copyBank}>{copied ? 'Copied' : 'Copy bank'}</Button>}>
      <FormGrid>
        <TextInput label="Question" value={prompt} onChange={setPrompt} placeholder="What is 2+2?" error={promptError} />
        <TextInput label="Correct answer" value={correct} onChange={setCorrect} placeholder="4" error={answersError} />
        <TextInput label="Wrong answer 1" value={wrong1} onChange={setWrong1} placeholder="3" />
        <TextInput label="Wrong answer 2" value={wrong2} onChange={setWrong2} placeholder="5" />
      </FormGrid>
      <Actions>
        <PrimaryButton onClick={addQuestion}>Add question</PrimaryButton>
      </Actions>
    </Card>
  )

  const questionsCard = (
    <Card
      mono={`${questions.length} saved`}
      title="Questions"
      actions={
        <Actions>
          <Button kind="ghost" ariaLabel="Export bank as JSON file" onClick={exportBank}>Export</Button>
          <Button kind="ghost" title="Open a bank JSON file" onClick={() => fileRef.current?.click()}>Import</Button>
        </Actions>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={openBankFile}
        aria-hidden="true"
      />
      {questions.length === 0 ? (
        <EmptyState
          mono="Empty"
          title="No questions yet"
          detail="Add your first question above."
          actionLabel="Add a question"
          onAction={addQuestion}
        />
      ) : (
        <List label="Questions">
          {questions.map((q) => (
            <Row
              key={q.id}
              title={q.prompt}
              meta={`Answer: ${q.correct}`}
              action={
                <Button kind="ghost" ariaLabel={`Delete ${q.prompt}`} onClick={() => deleteQuestion(q.id)}>
                  Delete
                </Button>
              }
            />
          ))}
        </List>
      )}
    </Card>
  )

  const importCard = (
    <Card mono="Import" title="Import a bank">
      <FormGrid>
        <TextInput
          label="Bank JSON"
          value={bankText}
          onChange={setBankText}
          rows={4}
          placeholder='{"format":"lacuna-quiz-bank","questions":[...]}'
          error={bankError}
        />
        <MonoLabel faint>Paste a bank exported from another device, or open its file.</MonoLabel>
      </FormGrid>
      {bankError ? (
        <ErrorState mono="Import" title="Could not read that bank" detail={bankError} />
      ) : importResult ? (
        <MonoLabel accent>{importResult}</MonoLabel>
      ) : null}
      <Actions>
        <PrimaryButton onClick={importFromText} disabled={bankText.trim() === ''}>Import questions</PrimaryButton>
      </Actions>
    </Card>
  )

  const settingsCard = (
    <Card mono="Settings" title="Study settings">
      <FormGrid>
        <Checkbox
          label="Shuffle the answer order in each session"
          checked={settings.shuffleAnswers}
          onChange={(next) => {
            const updated: QuizSettings = { shuffleAnswers: next }
            setSettings(updated)
            settingsStore.set(updated)
          }}
        />
      </FormGrid>
    </Card>
  )

  const studyCard = (() => {
    if (questions.length === 0) {
      return (
        <Card mono="Study" title="Study">
          <EmptyState
            mono="Empty"
            title="No questions yet"
            detail="Add a question in the Questions tab to start studying."
            actionLabel="Add a question"
            onAction={() => setTab('Questions')}
          />
        </Card>
      )
    }
    if (active === null) {
      return (
        <Card mono="Study" title="Study">
          <MonoLabel>{questions.length} {questions.length === 1 ? 'question' : 'questions'} ready</MonoLabel>
          <Actions>
            <PrimaryButton onClick={startSession}>Start session</PrimaryButton>
          </Actions>
        </Card>
      )
    }
    if (active.finished || currentQuestion === undefined) {
      return (
        <Card mono="Result" title="Session complete">
          <Stack>
            <MonoLabel>Score: {finishedScore ? `${finishedScore.correct}/${finishedScore.total}` : ''}</MonoLabel>
            <Actions>
              <PrimaryButton onClick={() => setActive(null)}>Review</PrimaryButton>
            </Actions>
          </Stack>
        </Card>
      )
    }
    const currentCorrect = currentQuestion.type === 'choice' ? correctAnswerFor(currentQuestion) : ''
    return (
      <Card
        mono={`Question ${active.index + 1} of ${active.session.questions.length}`}
        title={currentQuestion.prompt}
      >
        <Stack>
          {currentOptions?.map((option) => (
            <Button
              key={option}
              kind={active.selected === option ? 'primary' : 'secondary'}
              onClick={() => pick(option)}
              disabled={answered}
            >
              {option}
            </Button>
          ))}
          {answered && (
            <MonoLabel accent={wasCorrect}>{wasCorrect ? 'Correct' : `Incorrect — the answer is ${currentCorrect}`}</MonoLabel>
          )}
          <Actions>
            <PrimaryButton onClick={next} disabled={!answered}>
              Next
            </PrimaryButton>
          </Actions>
        </Stack>
      </Card>
    )
  })()

  const reviewCard = (
    <Card mono="Review" title="Last session">
      {latest ? (
        <List label="Session review">
          {latest.items.map((item, i) => (
            <Row
              key={i}
              title={item.prompt}
              meta={item.right ? 'Correct' : `Incorrect — the answer is ${item.correct}`}
            />
          ))}
        </List>
      ) : (
        <EmptyState
          mono="Empty"
          title="Nothing to review"
          detail="Start a session to see which questions you got right."
          actionLabel="Start a session"
          onAction={startSession}
        />
      )}
    </Card>
  )

  const historyCard = (
    <Card
      mono={`${sessions.length} past`}
      title="Session history"
      actions={
        <Button
          kind="ghost"
          title="Copy session history as JSON"
          onClick={() => void copy(JSON.stringify(sessions.map(({ id, ...rest }) => rest), null, 2))}
        >
          Copy history
        </Button>
      }
    >
      {sessions.length === 0 ? (
        <EmptyState
          mono="Empty"
          title="No sessions yet"
          detail="Run a study session and its score lands here."
          actionLabel="Start a session"
          onAction={startSession}
        />
      ) : (
        <Table
          label="Past sessions"
          columns={[
            { key: 'when', label: 'When' },
            { key: 'score', label: 'Score', num: true },
            { key: 'state', label: 'State' },
          ]}
          rows={sessions.map((s, i) => ({
            cells: {
              when: formatDate(s.startedAt),
              score: `${s.correct}/${s.total}`,
              state: i === 0 ? 'latest' : '',
            },
          }))}
        />
      )}
    </Card>
  )

  return (
    <AppShell
      name="Quiz Maker"
      icon="school"
      hue="cobalt"
      category="Productivity"
      meta={`${questions.length} ${questions.length === 1 ? 'question' : 'questions'}`}
      status={
        active !== null && currentQuestion !== undefined
          ? `Question ${active.index + 1} of ${active.session.questions.length}`
          : latest
            ? `Last score ${latest.correct}/${latest.total}`
            : undefined
      }
      side={
        <Rail
          title="Session"
          note="Shuffled order, one question at a time."
          chips={[
            `${questions.length} in the bank`,
            `${sessions.length} sessions kept`,
            settings.shuffleAnswers ? 'Answers shuffled' : 'Answers in order',
          ]}
        >
          <KpiRow>
            <Kpi value={latest ? `${latest.correct}/${latest.total}` : '—'} label="Last score" accent />
            <Kpi value={String(questions.length)} label="Questions" />
            <Kpi value={String(sessions.length)} label="Sessions" />
          </KpiRow>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Quiz Maker views">
        {(['Questions', 'Study'] as const).map((t) => (
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
      {tab === 'Questions' ? (
        <Stack>
          {questionCard}
          {questionsCard}
          {importCard}
          {settingsCard}
        </Stack>
      ) : (
        <Stack>
          {studyCard}
          {reviewCard}
          {historyCard}
        </Stack>
      )}
    </AppShell>
  )
}

function toEngineQuestion(q: QuizQuestion, shuffleAnswers: boolean): ChoiceQuestion {
  const base = [q.correct, ...q.wrong]
  const options = shuffleAnswers ? shuffle(mulberry32(q.id.length * 7 + base.length), base) : base
  return {
    type: 'choice',
    id: q.id,
    prompt: q.prompt,
    options,
    correctIndex: options.indexOf(q.correct),
  }
}
