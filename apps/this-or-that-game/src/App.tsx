import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Stack,
  Table,
  Tabs,
} from '@lacuna/ui'
import { checkAnswer, scoreSession, type ChoiceQuestion } from '@lacuna/quiz-engine'
import { clearStorage, loadGame, saveGame } from './host'

const BANK: ChoiceQuestion[] = [
  { type: 'choice', id: 'q1', prompt: 'Coffee or Tea?', options: ['Coffee', 'Tea'], correctIndex: 0 },
  { type: 'choice', id: 'q2', prompt: 'Cats or Dogs?', options: ['Cats', 'Dogs'], correctIndex: 0 },
  { type: 'choice', id: 'q3', prompt: 'Beach or Mountains?', options: ['Beach', 'Mountains'], correctIndex: 0 },
  { type: 'choice', id: 'q4', prompt: 'Sunrise or Sunset?', options: ['Sunrise', 'Sunset'], correctIndex: 0 },
  { type: 'choice', id: 'q5', prompt: 'Books or Films?', options: ['Books', 'Films'], correctIndex: 0 },
]

const TOTAL = BANK.length

export function App() {
  const [game, setGame] = useState(() => loadGame())
  const [tab, setTab] = useState<string>('Play')
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const answers = game.answers
  const score = game.score
  const best = game.best
  const finished = answers.length >= TOTAL
  const question = index < TOTAL ? BANK[index] : null

  function persist(nextAnswers: typeof answers, nextScore: number) {
    const nextBest = Math.max(best, nextScore)
    setGame({ answers: nextAnswers, score: nextScore, best: nextBest })
    saveGame({ answers: nextAnswers, score: nextScore, best: nextBest })
  }

  function startGame() {
    setGame({ answers: [], score: 0, best })
    saveGame({ answers: [], score: 0, best })
    setStarted(true)
    setIndex(0)
    setPicked(null)
    setTab('Play')
  }

  function pick(option: string) {
    if (!question || picked !== null || finished) return
    const correct = checkAnswer(question, option)
    const nextAnswers = [
      ...answers,
      { questionId: question.id, prompt: question.prompt, picked: option, points: correct ? 1 : 0 },
    ]
    persist(nextAnswers, score + (correct ? 1 : 0))
    setPicked(option)
  }

  function next() {
    if (index >= TOTAL - 1) {
      setPicked(null)
      setIndex(TOTAL)
      return
    }
    setIndex(index + 1)
    setPicked(null)
  }

  const scoreSummary = scoreSession(
    { questions: BANK, seed: 0 },
    answers.map((a) => ({ questionId: a.questionId, correct: a.points === 1, given: a.picked })),
  )

  const rows = answers.map((a) => ({
    cells: { prompt: a.prompt, picked: a.picked, points: String(a.points) },
  }))

  return (
    <AppShell
      name="This Or That"
      icon="tasks"
      hue="cobalt"
      category="Personal"
      meta={`Score ${score} / ${TOTAL}`}
      status="Saved on this device"
      side={
        <Rail
          title="This Or That"
          note={`${answers.length} of ${TOTAL} answered`}
          chips={['Five questions', 'One pick each', '1 point a pick', 'Best score kept']}
        >
          <KpiRow>
            <Kpi label="Score" value={score} />
            <Kpi label="Best" value={best} accent={best >= TOTAL} />
          </KpiRow>
          <Tabs items={['Play', 'Results']} active={tab} onSelect={setTab} />
        </Rail>
      }
    >
      {tab === 'Play' ? (
        <Card
          mono={finished ? 'Round done' : started ? `Question ${Math.min(index + 1, TOTAL)} of ${TOTAL}` : 'Five quick picks'}
          title={finished ? 'Round complete' : question ? question.prompt : 'Pick a side'}
          accent={finished}
        >
          {!started ? (
            <EmptyState title="No answers yet" detail="Five quick questions, one pick each. Every pick scores a point.">
              <Actions>
                <Button kind="primary" onClick={startGame}>Start game</Button>
              </Actions>
            </EmptyState>
          ) : finished ? (
            <EmptyState title={`Score: ${score} / ${TOTAL}`} detail={`Best score: ${best}`}>
              <Actions>
                <Button kind="primary" onClick={startGame}>Restart</Button>
              </Actions>
            </EmptyState>
          ) : (
            <Stack>
              <MonoLabel>Score: {score}</MonoLabel>
              {picked === null ? (
                <Stack>
                  {question!.options.map((option) => (
                    <Button key={option} kind="secondary" style={{ width: '100%' }} onClick={() => pick(option)}>
                      {option}
                    </Button>
                  ))}
                </Stack>
              ) : (
                <EmptyState title={`You picked ${picked}`} detail={`1 point · ${score} of ${TOTAL} so far`}>
                  <Actions>
                    <Button kind="primary" onClick={next}>Next question</Button>
                  </Actions>
                </EmptyState>
              )}
            </Stack>
          )}
        </Card>
      ) : (
        <Card mono={`${answers.length} answered`} title="Results" accent={answers.length > 0}>
          {answers.length === 0 ? (
            <EmptyState title="No answers yet" detail="Finish a round and your picks will be listed here." />
          ) : (
            <Table
              label="Your answers"
              columns={[
                { key: 'prompt', label: 'Question' },
                { key: 'picked', label: 'Picked' },
                { key: 'points', label: 'Points', num: true },
              ]}
              rows={rows}
              foot={{ prompt: `Score: ${scoreSummary.correct} / ${TOTAL}`, picked: '', points: String(scoreSummary.correct) }}
            />
          )}
        </Card>
      )}
      {answers.length > 0 && (
        <Actions>
          <Button kind="danger" onClick={() => { clearStorage(); startGame() }}>Clear saved data</Button>
        </Actions>
      )}
    </AppShell>
  )
}
