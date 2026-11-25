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
} from '@lacuna/ui'
import { loadGame, saveGame } from './host'

type Question = { type: 'choice'; id: string; prompt: string; options: string[]; correctIndex: number }

const BANK: Question[] = [
  { type: 'choice', id: 'q1', prompt: 'Coffee or Tea?', options: ['Coffee', 'Tea'], correctIndex: 0 },
  { type: 'choice', id: 'q2', prompt: 'Cats or Dogs?', options: ['Cats', 'Dogs'], correctIndex: 0 },
  { type: 'choice', id: 'q3', prompt: 'Beach or Mountains?', options: ['Beach', 'Mountains'], correctIndex: 0 },
  { type: 'choice', id: 'q4', prompt: 'Books or Movies?', options: ['Books', 'Movies'], correctIndex: 0 },
  { type: 'choice', id: 'q5', prompt: 'Summer or Winter?', options: ['Summer', 'Winter'], correctIndex: 0 },
]

const TOTAL = BANK.length

type Game = { answers: { questionId: string; prompt: string; picked: string; points: number }[]; score: number; best: number }

export function App() {
  const [game, setGame] = useState<Game>(() => loadGame())
  const [tab, setTab] = useState<'Play' | 'Results'>('Play')
  const [started, setStarted] = useState(() => loadGame().answers.length > 0)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const answers = game.answers
  const score = game.score
  const best = game.best
  const finished = started && answers.length >= TOTAL && done
  const playing = started && !finished
  const index = playing ? (answers.length < TOTAL ? Math.min(answers.length, TOTAL) : 0) : 0
  const question = playing ? BANK[index] : null

  function persist(next: Game) {
    setGame(next)
    saveGame(next)
  }

  function startGame() {
    persist({ answers: [], score: 0, best })
    setStarted(true)
    setDone(false)
    setPicked(null)
    setTab('Play')
  }

  function restart() {
    persist({ answers, score: 0, best })
    setDone(false)
    setPicked(null)
    setTab('Play')
    window.setTimeout(() => {
      persist({ answers: [], score: 0, best })
    }, 0)
  }

  function pick(option: string) {
    if (!playing || !question || picked !== null) return
    const nextAnswers = [
      ...answers,
      { questionId: question.id, prompt: question.prompt, picked: option, points: 1 },
    ]
    const nextScore = score + 1
    const nextBest = nextAnswers.length === TOTAL ? Math.max(best, nextScore) : best
    persist({ answers: nextAnswers, score: nextScore, best: nextBest })
    setPicked(option)
  }

  function next() {
    setPicked(null)
    if (answers.length >= TOTAL) setDone(true)
  }

  const rows = answers.map((a) => ({
    cells: { prompt: a.prompt, picked: a.picked, points: String(a.points) },
  }))

  const playPanel = () => {
    if (playing && picked === null && question) {
      return (
        <div role="region" aria-label="Question">
          <MonoLabel>Question {index + 1} of {TOTAL}</MonoLabel>
          <div className="ot-prompt">{question.prompt}</div>
          <Stack>
            {question.options.map((option: string) => (
              <Button key={option} kind="secondary" style={{ width: '100%' }} onClick={() => pick(option)}>
                {option}
              </Button>
            ))}
          </Stack>
        </div>
      )
    }
    if (playing && picked !== null) {
      const last = answers.length >= TOTAL
      return (
        <EmptyState title={`You picked ${picked}`} detail={`${score} of ${TOTAL} so far`}>
          <Actions>
            <Button kind="primary" onClick={next}>Next question</Button>
          </Actions>
        </EmptyState>
      )
    }
    if (finished) {
      return (
        <EmptyState title="Round complete" detail="You finished all five questions.">
          <Actions>
            <Button kind="primary" onClick={restart}>Restart</Button>
          </Actions>
        </EmptyState>
      )
    }
    return (
      <EmptyState title="No answers yet" detail="Five quick questions, one pick each. Every pick scores a point.">
        <Actions>
          <Button kind="primary" onClick={startGame}>Start game</Button>
        </Actions>
      </EmptyState>
    )
  }

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
          <MonoLabel style={{ color: 'var(--ink)' }}>{`Best score: ${best}`}</MonoLabel>
        </Rail>
      }
    >
      <div role="tablist" className="lc-tabs" aria-label="This Or That views">
        {(['Play', 'Results'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            style={{ color: 'var(--ink-60)' }}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === 'Play' && started && <MonoLabel style={{ color: 'var(--ink)' }}>{`Score: ${score}`}</MonoLabel>}
      {tab === 'Play' ? (
        <Card
          mono={finished ? 'Round done' : playing ? `Question ${Math.min(index + 1, TOTAL)} of ${TOTAL}` : 'Five quick picks'}
          title={finished ? 'Round complete' : question ? question.prompt : 'Pick a side'}
          accent={finished}
        >
          {playPanel()}
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
              foot={{ prompt: `Score: ${score} / ${TOTAL}`, picked: '', points: String(score) }}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
