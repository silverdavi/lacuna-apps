import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useGame, type Phase } from './host'

const RAIL_CHIPS = ['seeded', 'persists', 'history', 'exports']

const PIP: CSSProperties = {
  display: 'inline-block',
  width: 'calc(9px * var(--tf))',
  height: 'calc(9px * var(--tf))',
  borderRadius: 'calc(4px * var(--tf))',
  background: 'var(--ink-40)',
}

const PIP_USED: CSSProperties = {
  ...PIP,
  background: 'var(--accent)',
}

const PIPS_WRAP: CSSProperties = {
  display: 'flex',
  gap: 'calc(5px * var(--tf))',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const GUESS_ROW: CSSProperties = {
  display: 'flex',
  gap: 'calc(10px * var(--tf))',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
}

const NEWGAME_ACTIONS: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
}

function AttemptsPips({ used, max }: { used: number; max: number }) {
  return (
    <span style={PIPS_WRAP} aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={i < used ? PIP_USED : PIP} />
      ))}
    </span>
  )
}

export function App() {
  const {
    seed,
    setSeed,
    targetSet,
    guess,
    setGuess,
    rows,
    phase,
    toast,
    best,
    attempts,
    maxAttempts,
    newGame,
    submit,
    lastWin,
  } = useGame()

  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)

  const historyText = useMemo(
    () => rows.map((r, i) => `${i + 1}. ${r.value} — ${r.hint}`).join('\n'),
    [rows],
  )

  useEffect(
    () => () => {
      if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current)
    },
    [],
  )

  const copyHistory = async () => {
    if (rows.length === 0) return
    try {
      await navigator.clipboard.writeText(historyText)
      setCopied(true)
      if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const guessInvalid =
    phase === 'playing' && guess.trim() !== '' && !/^\d+$/.test(guess.trim())
  const seedInvalid = targetSet && seed.trim() !== '' && !/^\d+$/.test(seed.trim())

  const status =
    phase === 'idle'
      ? 'No game started'
      : phase === 'won'
        ? `Won in ${attempts} attempts`
        : phase === 'lost'
          ? 'Out of attempts'
          : `Guessing, ${maxAttempts - attempts} left`

  return (
    <AppShell
      name="Number Guess Game"
      hue="blue"
      category="Games"
      meta={status}
      side={<Rail title="Capabilities" note="what this app does" chips={RAIL_CHIPS} />}
    >
      <section aria-label="Scoreboard">
        <KpiRow>
          <Kpi label="Attempts" value={phase === 'idle' ? '—' : String(attempts)} />
          <Kpi label="" value={best === null ? 'No best yet' : `Best Score: ${best}`} />
          <Kpi label="Status" value={status} />
        </KpiRow>
      </section>

      <Card title="New game" mono="pick a seed to start">
        <FormGrid>
          <TextInput
            label="Seed"
            value={seed}
            onChange={setSeed}
            placeholder="42"
            inputMode="numeric"
            error={seedInvalid ? 'Seed must be a number' : null}
          />
        </FormGrid>
        <div style={NEWGAME_ACTIONS}>
          <Button kind="primary" onClick={newGame} disabled={seedInvalid}>
            New Game
          </Button>
        </div>
      </Card>

      <Card
        title="Guess"
        mono="a number between 1 and 100"
        actions={
          phase === 'won' ? <Tag accent>Won in {attempts} attempts</Tag> : undefined
        }
      >
        {phase !== 'idle' && (
          <p className="lc-body" aria-label="Instructions">
            Guess the number between 1 and 100
          </p>
        )}
        <div style={GUESS_ROW}>
          <TextInput
            label="Guess"
            value={guess}
            onChange={setGuess}
            placeholder="1–100"
            inputMode="numeric"
            error={guessInvalid ? 'Enter a number between 1 and 100' : null}
          />
          <Button kind="primary" onClick={submit} disabled={phase !== 'playing'}>
            Submit
          </Button>
        </div>
        <div style={PIPS_WRAP}>
          <span className="lc-mono lc-mono-sm">
            {phase === 'idle'
              ? 'start a game to begin'
              : `${attempts} of ${maxAttempts} attempts used`}
          </span>
        </div>
      </Card>

      <Card
        title="History"
        mono="every guess in this game, oldest first"
        actions={
          rows.length > 0 ? (
            <Button kind="ghost" onClick={copyHistory}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No guesses yet"
            detail={
              phase === 'idle'
                ? 'Start a game with a seed, then enter a number between 1 and 100.'
                : 'Enter a number between 1 and 100 and submit it.'
            }
            mono="guess · hint"
            actionLabel={phase === 'idle' ? 'start a game' : 'make a guess'}
          />
        ) : (
          <Table
            label="History"
            columns={[
              { key: 'n', label: '#' },
              { key: 'value', label: 'Guess', num: true },
              { key: 'hint', label: 'Hint' },
            ]}
            rows={rows.map((r, i) => ({
              cells: { n: String(i + 1), value: String(r.value), hint: r.hint },
            }))}
          />
        )}
      </Card>

      {lastWin !== null && (
        <Card title="Last win" mono="the game that just ended">
          <p className="lc-body">
            Seed <span className="lc-mono">{lastWin.seed}</span> · target{' '}
            <span className="lc-mono">{lastWin.target}</span> · won in{' '}
            <span className="lc-mono">{lastWin.attempts}</span> attempts
          </p>
        </Card>
      )}

      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--paper)',
          }}
        >
          {toast}
        </div>
      )}
    </AppShell>
  )
}
