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
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { mulberry32 } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { loadState, saveState, type Outcome, type PersistedState, type Round } from './host'
import './app.css'

const CHOICES = ['Rock', 'Paper', 'Scissors'] as const
const BEATS: Record<string, string> = { Rock: 'Scissors', Paper: 'Rock', Scissors: 'Paper' }
const GLYPH: Record<string, string> = { Rock: '\u{1F4A6}', Paper: '\u{1F44D}', Scissors: '✌️' }

type LastRound = { you: string; computer: string; outcome: Outcome }

function computerIndex(seed: string, round: number): number {
  const num = parseInt(seed.trim(), 10)
  const n = Number.isNaN(num) ? 0 : num
  const rng = mulberry32(n * 3 + round)
  rng()
  return Math.floor(rng() * 3) % 3
}

function outcomeOf(you: string, computer: string): Outcome {
  if (you === computer) return 'Draw'
  if (BEATS[you] === computer) return 'Win'
  return 'Lose'
}

export function App() {
  const [state, setState] = useState<PersistedState>(() => loadState())
  const [seed, setSeed] = useState('')
  const [last, setLast] = useState<LastRound | null>(null)
  const [tab, setTab] = useState<'Play' | 'History'>('Play')
  const clipboard = useClipboard({ timeoutMs: 1600 })

  function persist(next: PersistedState) {
    setState(next)
    saveState(next)
  }

  function play(choice: string) {
    const round = state.rounds.length + 1
    const computer = CHOICES[computerIndex(seed, round)] ?? 'Rock'
    const outcome = outcomeOf(choice, computer)
    const nextScore = outcome === 'Win' ? state.score + 1 : state.score
    const nextBest = Math.max(state.best, nextScore)
    const nextRound: Round = { n: round, you: choice, computer, outcome }
    setLast({ you: choice, computer, outcome })
    setTab('Play')
    persist({ score: nextScore, best: nextBest, rounds: [...state.rounds, nextRound] })
  }

  function restart() {
    setLast(null)
    setTab('Play')
    persist({ score: 0, best: state.best, rounds: [] })
  }

  function copyScore() {
    void clipboard.copy(`Score: ${state.score}, Best: ${state.best}`)
  }

  const statusText = last
    ? `Round ${state.rounds.length}`
    : state.rounds.length
      ? `Rounds: ${state.rounds.length}`
      : 'Ready'

  const historyRows = state.rounds.map((r) => ({
    cells: { n: r.n, you: r.you, computer: r.computer, outcome: r.outcome },
  }))

  return (
    <AppShell
      name="Hand Duel"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`${state.rounds.length} ${state.rounds.length === 1 ? 'round' : 'rounds'}`}
      status={statusText}
      side={
        <Rail title="Score" note={`${state.rounds.length} played`}>
          <KpiRow>
            <Kpi label="Score" value={state.score} />
            <Kpi label="Best" value={state.best} accent />
          </KpiRow>
          <MonoLabel>{`Best: ${state.best}`}</MonoLabel>
          <Actions>
            <Button onClick={copyScore}>{clipboard.copied ? 'Score copied' : 'Copy score'}</Button>
          </Actions>
        </Rail>
      }
    >
      <h1 aria-label="Rock Paper Scissors" style={{ margin: 0, fontFamily: 'var(--serif)' }}>\u270A \u270B \u270C</h1>
      <div role="tablist" aria-label="Sections">
        {(['Play', 'History'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab rps-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <Card
        mono="Round"
        title="Pick a move"
        actions={
          <Actions>
            <Button kind="primary" onClick={restart}>
              Restart
            </Button>
          </Actions>
        }
      >
        <TextInput label="Seed" value={seed} onChange={setSeed} />
        <Actions>
          {CHOICES.map((c) => (
            <Button key={c} kind="primary" ariaLabel={c} onClick={() => play(c)}>
              {GLYPH[c]}
            </Button>
          ))}
        </Actions>
        {last ? (
          <div>
            <div>
              <Tag accent>{`You: ${last.you}`}</Tag>
            </div>
            <div>
              {last.computer === last.you ? (
                <Tag>
                  <span aria-label={`Computer: ${last.computer}`}>
                    <span aria-hidden>{GLYPH[last.computer]}</span>
                  </span>
                </Tag>
              ) : (
                <Tag>Computer: {last.computer}</Tag>
              )}
            </div>
            <div>
              <Tag accent={last.outcome === 'Win'}>{last.outcome}</Tag>
            </div>
            <MonoLabel>{`Score: ${state.score}`}</MonoLabel>
          </div>
        ) : (
          <div>
            <EmptyState
              title="No rounds yet"
              detail="Choose a move to start a round."
              actionLabel="Play a round"
              onAction={() => setTab('Play')}
            />
            <MonoLabel>Score: 0</MonoLabel>
          </div>
        )}
      </Card>

      {tab === 'History' && (
        <Card mono="History" title="Played rounds" accent={state.rounds.length > 0}>
          {state.rounds.length === 0 ? (
            <EmptyState title="No rounds yet" detail="Played moves appear here." actionLabel="Play a round" onAction={() => setTab('Play')} />
          ) : (
            <Table
              label="Played rounds"
              columns={[
                { key: 'n', label: '#', num: true },
                { key: 'you', label: 'You' },
                { key: 'computer', label: 'Computer' },
                { key: 'outcome', label: 'Result' },
              ]}
              rows={historyRows}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
