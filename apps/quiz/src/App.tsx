import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, MonoLabel, PrimaryButton, Row, Stack, TextInput } from '@lacuna/ui'
import { checkAnswer, createSession, scoreSession, type AnswerResult, type ChoiceQuestion, type QuizSession } from '@lacuna/quiz-engine'
import { questionStore, type QuizQuestion } from './host'

const TABS = ['Questions', 'Study'] as const
type Tab = (typeof TABS)[number]

function toEngineQuestion(q: QuizQuestion) {
  return {
    type: 'choice' as const,
    id: q.id,
    prompt: q.prompt,
    options: [q.correct, ...q.wrong],
    correctIndex: 0,
  }
}

interface SessionState {
  session: QuizSession & { questions: ChoiceQuestion[] }
  index: number
  selected: string | null
  results: AnswerResult[]
}

function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="lc-tabs" role="tablist" aria-label="Quiz Maker views">
      {TABS.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={active === item}
          className={active === item ? 'lc-tab active' : 'lc-tab'}
          style={{ color: active === item ? 'var(--ink)' : 'var(--ink-80)' }}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('Questions')
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => questionStore.list())

  const [prompt, setPrompt] = useState('')
  const [correct, setCorrect] = useState('')
  const [wrong1, setWrong1] = useState('')
  const [wrong2, setWrong2] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [session, setSession] = useState<SessionState | null>(null)
  const [showReview, setShowReview] = useState(false)

  const score = session ? scoreSession(session.session, session.results) : null

  function addQuestion() {
    const p = prompt.trim()
    const c = correct.trim()
    const w1 = wrong1.trim()
    const w2 = wrong2.trim()
    if (!p || !c || !w1 || !w2) {
      setFormError('Fill in the question and all three answers')
      return
    }
    const options = [c, w1, w2]
    if (new Set(options).size !== options.length) {
      setFormError('The three answers must all be different')
      return
    }
    questionStore.add({ prompt: p, correct: c, wrong: [w1, w2] })
    setQuestions(questionStore.list())
    setPrompt('')
    setCorrect('')
    setWrong1('')
    setWrong2('')
    setFormError(null)
  }

  function deleteQuestion(id: string) {
    questionStore.remove(id)
    setQuestions(questionStore.list())
  }

  function startSession() {
    if (questions.length === 0) return
    const seed = (Date.now() % 1_000_000) + 1
    setSession({
      session: { ...createSession(questions.map(toEngineQuestion), seed), questions: questions.map(toEngineQuestion) },
      index: 0,
      selected: null,
      results: [],
    })
    setShowReview(false)
  }

  function pick(option: string) {
    if (!session || session.selected !== null) return
    const question = session.session.questions[session.index]
    if (!question) return
    setSession({
      ...session,
      selected: option,
      results: [...session.results, { questionId: question.id, correct: checkAnswer(question, option), given: option }],
    })
  }

  function next() {
    if (!session) return
    if (session.index + 1 < session.session.questions.length) {
      setSession({ ...session, index: session.index + 1, selected: null })
    } else {
      setSession({ ...session, index: session.index + 1 })
    }
  }

  const currentQuestion = session ? session.session.questions[session.index] : undefined
  const answered = session ? session.selected !== null : false
  const wasCorrect = session ? session.results[session.index]?.correct : false
  const inSession = session !== null && !showReview
  const atEnd = session !== null && session.index + 1 > session.session.questions.length

  const studyTab = (
    <Stack>
      {session === null && questions.length === 0 && (
        <Card mono="Study" title="Study">
          <EmptyState
            mono="Empty"
            title="No questions yet"
            detail="Add a question in the Questions tab to start studying."
            actionLabel="Add a question"
            onAction={() => setTab('Questions')}
          />
        </Card>
      )}
      {session === null && questions.length > 0 && (
        <Card mono="Study" title="Study">
          <MonoLabel>{questions.length} {questions.length === 1 ? 'question' : 'questions'} ready</MonoLabel>
          <Actions>
            <PrimaryButton onClick={startSession}>Start session</PrimaryButton>
          </Actions>
        </Card>
      )}
      {inSession && currentQuestion && (
        <Card mono={`Question ${session.index + 1} of ${session.session.questions.length}`} title={currentQuestion.prompt}>
          <Stack>
            {currentQuestion.options.map((option) => (
              <Button
                key={option}
                kind={session.selected === option ? 'primary' : 'secondary'}
                onClick={() => pick(option)}
                disabled={answered}
              >
                {option}
              </Button>
            ))}
            {answered && <MonoLabel accent={wasCorrect}>{wasCorrect ? 'Correct' : 'Incorrect'}</MonoLabel>}
            <Actions>
              <PrimaryButton onClick={next} disabled={!answered}>
                Next
              </PrimaryButton>
            </Actions>
          </Stack>
        </Card>
      )}
      {inSession && atEnd && answered && (
        <Card mono="Result" title="Session complete">
          <Stack>
            <MonoLabel>Score: {score ? `${score.correct}/${score.total}` : ''}</MonoLabel>
            <Actions>
              <PrimaryButton onClick={() => setShowReview(true)}>Review</PrimaryButton>
            </Actions>
          </Stack>
        </Card>
      )}
      {session !== null && showReview && (
        <Card mono="Review" title="Review">
          <List label="Session review">
            {session.results.map((result, i) => {
              const q = session.session.questions[i]
              return (
                <Row key={result.questionId} title={q?.prompt ?? result.questionId} meta={result.correct ? 'Correct' : 'Incorrect'} />
              )
            })}
          </List>
        </Card>
      )}
    </Stack>
  )

  return (
    <AppShell
      name="Quiz Maker"
      icon="school"
      hue="gold"
      category="Productivity"
      meta={`${questions.length} ${questions.length === 1 ? 'question' : 'questions'}`}
      status={inSession && currentQuestion ? `Question ${session.index + 1} of ${session.session.questions.length}` : undefined}
    >
      <TabBar active={tab} onSelect={setTab} />
      {tab === 'Questions' ? (
        <Stack>
          <Card mono="New" title="Add a question">
            <FormGrid>
              <TextInput label="Question" value={prompt} onChange={setPrompt} placeholder="What is 2+2?" />
              <TextInput label="Correct answer" value={correct} onChange={setCorrect} />
              <TextInput label="Wrong answer 1" value={wrong1} onChange={setWrong1} />
              <TextInput label="Wrong answer 2" value={wrong2} onChange={setWrong2} />
            </FormGrid>
            {formError && <MonoLabel accent>{formError}</MonoLabel>}
            <Actions>
              <PrimaryButton onClick={addQuestion}>Add question</PrimaryButton>
            </Actions>
          </Card>
          <Card mono={`${questions.length} saved`} title="Questions">
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
        </Stack>
      ) : (
        studyTab
      )}
    </AppShell>
  )
}
