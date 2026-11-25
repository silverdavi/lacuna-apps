import { useLayoutEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Table,
} from '@lacuna/ui'
import { ExportMenu } from '@lacuna/export-menu'
import { loadGame, saveGame } from './host'
import type { GameState } from './host/mock'

const QUESTIONS: [string, string, string][] = [
  ['Coffee or Tea?', 'Coffee', 'Tea'],
  ['Cats or Dogs?', 'Cats', 'Dogs'],
  ['Beach or Mountains?', 'Beach', 'Mountains'],
  ['Books or Movies?', 'Books', 'Movies'],
  ['Summer or Winter?', 'Summer', 'Winter'],
]

function buildExport(state: GameState): string {
  return [
    'This Or That',
    '',
    `Score: ${state.score}`,
    `Best score: ${state.best}`,
    '',
    ...state.answers.map((a, i) => `${i + 1}. ${a.prompt} → ${a.picked} (${a.points} pt)`),
  ].join('\n')
}

type Tab = 'Play' | 'Results'

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame())
  const [tab, setTab] = useState<Tab>('Play')
  const [started, setStarted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [lastPick, setLastPick] = useState<string | null>(null)

  useLayoutEffect(() => {
    saveGame(game)
  }, [game])

  const start = () => {
    setGame((g) => ({ answers: [], score: 0, best: g.best }))
    setCurrentQ(0)
    setLastPick(null)
    setStarted(true)
  }

  const pick = (index: number, side: 'left' | 'right') => {
    const [, left, right] = QUESTIONS[index]
    const picked = side === 'left' ? left : right
    setGame((g) => {
      const answers = [
        ...g.answers,
        { questionId: `q${index}`, prompt: QUESTIONS[index][0], picked, points: 1 },
      ]
      return { answers, score: answers.length, best: Math.max(g.best, answers.length) }
    })
    setLastPick(picked)
  }

  const next = () => {
    if (currentQ + 1 >= QUESTIONS.length) {
      setLastPick(null)
    } else {
      setCurrentQ(currentQ + 1)
      setLastPick(null)
    }
  }

  const restart = () => {
    setGame((g) => ({ answers: [], score: 0, best: g.best }))
    setCurrentQ(0)
    setLastPick(null)
    setStarted(true)
  }

  const answered = game.answers.length
  const total = QUESTIONS.length
  const finished = answered >= total

  const resultsRows = game.answers.map((a) => ({
    cells: {
      question: a.prompt,
      pick: a.picked,
      points: String(a.points),
    },
  }))

  const exportOptions = [
    {
      id: 'txt',
      label: 'Text summary',
      mimeType: 'text/plain',
      extension: 'txt',
      getData: () => buildExport(game),
    },
  ]

  return (
    <AppShell
      name="This Or That"
      icon="tasks"
      hue="gold"
      category="Games"
      meta={finished ? 'Completed' : `${answered}/${total}`}
      status="Saved on this device"
      side={
        <Rail
          title="This Or That"
          note="Five questions · local"
          chips={['Score', 'Best', 'Export', 'Offline']}
        >
          <Body sm>
            Pick a side on each question. One point per answer. Your best score stays on this
            device.
          </Body>
        </Rail>
      }
    >
      <Stack lg>
        <div role="tablist" className="lc-tabs">
          {(['Play', 'Results'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={'lc-tab' + (tab === t ? ' active' : '')}
              style={tab !== t ? { color: 'var(--ink-60)' } : undefined}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Play' ? (
          <Stack lg>
            <KpiRow>
              <Kpi value={game.score} label="Score" accent />
              <Kpi value={game.best} label="Best" />
              <Kpi value={`${answered}/${total}`} label="Answered" />
            </KpiRow>
            <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', color: 'var(--ink)' }}>
              <span>Score: {game.score}</span>
              <span>Best score: {game.best}</span>
            </div>

            {!started ? (
              <Card mono="Ready" title="This Or That">
                <Stack>
                  <Body>No answers yet</Body>
                  <Body sm>Answer five quick two-choice questions to build your profile.</Body>
                  <Stack style={{ marginTop: 'calc(10px * var(--sf))' }}>
                    <Button kind="primary" onClick={start}>
                      Start game
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ) : lastPick ? (
              <div role="region" aria-label="Question">
                <Card
                  mono={`Question ${currentQ + 1} of ${total}`}
                  title={QUESTIONS[currentQ][0]}
                >
                  <Stack>
                    <Body>You picked {lastPick}</Body>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'calc(12px * var(--sf))',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <Button kind="primary" onClick={next}>
                        Next question
                      </Button>
                      <Button kind="ghost" onClick={restart}>
                        Restart
                      </Button>
                    </div>
                  </Stack>
                </Card>
              </div>
            ) : finished ? (
              <Card mono="Done" title="All five answered">
                <Stack>
                  <Body>
                    Score: {game.score} · Best score: {game.best}
                  </Body>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(12px * var(--sf))',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button kind="primary" onClick={restart}>
                      Restart
                    </Button>
                    <Button kind="secondary" onClick={() => setTab('Results')}>
                      View results
                    </Button>
                  </div>
                </Stack>
              </Card>
            ) : (
              <div role="region" aria-label="Question">
                <Card
                  mono={`Question ${currentQ + 1} of ${total}`}
                  title={QUESTIONS[currentQ][0]}
                >
                  <Stack>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'calc(12px * var(--sf))',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button kind="secondary" onClick={() => pick(currentQ, 'left')}>
                        {QUESTIONS[currentQ][1]}
                      </Button>
                      <Button kind="secondary" onClick={() => pick(currentQ, 'right')}>
                        {QUESTIONS[currentQ][2]}
                      </Button>
                    </div>
                    <Actions>
                      <Button kind="ghost" onClick={restart}>
                        Restart
                      </Button>
                    </Actions>
                  </Stack>
                </Card>
              </div>
            )}
          </Stack>
        ) : (
          <Stack lg>
            <KpiRow>
              <Kpi value={game.score} label="Score" accent />
              <Kpi value={game.best} label="Best" />
              <Kpi value={`${answered}/${total}`} label="Answered" />
            </KpiRow>
            <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', color: 'var(--ink)' }}>
              <span>Score: {game.score}</span>
              <span>Best score: {game.best}</span>
            </div>

            <Card
              mono={`${answered} ${answered === 1 ? 'pick' : 'picks'}`}
              title="Your picks"
              actions={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'calc(8px * var(--sf))',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(11px * var(--tf))',
                    color: 'var(--ink-60)',
                  }}
                >
                  <span>EXPORT</span>
                  <ExportMenu
                    options={exportOptions}
                    fileName="this-or-that"
                    ariaLabel="Export results"
                    disabled={answered === 0}
                  />
                </div>
              }
            >
              {answered === 0 ? (
                <Body>No answers yet</Body>
              ) : (
                <Table
                  label="Your picks"
                  columns={[
                    { key: 'question', label: 'Question' },
                    { key: 'pick', label: 'Picked' },
                    { key: 'points', label: 'Points', num: true },
                  ]}
                  rows={resultsRows}
                  foot={{
                    question: '',
                    pick: `Score: ${game.score}`,
                    points: '',
                  }}
                />
              )}
            </Card>
          </Stack>
        )}
      </Stack>
    </AppShell>
  )
}
