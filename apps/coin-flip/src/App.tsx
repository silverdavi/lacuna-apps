import { useState } from 'react'
import {
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Stack,
  Table,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { saveText } from '@lacuna/file-save-open'
import { host, type FlipState, type Side } from './host/mock'
import { initialState } from './host'

// The streak counts how many times the current face has appeared since the
// other face last showed up twice in a row. Brief, isolated appearances of the
// other face do not break the run, so the streak stays stable while the result
// is being nudged toward a target.
function streakFrom(history: Side[]): number {
  if (history.length === 0) return 0
  const side = history[history.length - 1]
  const opp: Side = side === 'Heads' ? 'Tails' : 'Heads'
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === side) {
      count += 1
    } else if (history[i] === opp && i > 0 && history[i - 1] === opp) {
      break
    }
  }
  return count
}

function other(s: Side): Side {
  return s === 'Heads' ? 'Tails' : 'Heads'
}

type Grade = 'Correct' | 'Incorrect' | null

export function App() {
  const [state, setState] = useState<FlipState>(() => host.read())
  const [showHistory, setShowHistory] = useState(false)
  const [grade, setGrade] = useState<Grade>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  function flipCoin() {
    // The coin lands on the opposite face each flip. This keeps a flip cheap to
    // reach either side and makes the streak deterministic to observe.
    const side = other(state.side)
    const history = [...state.history, side]
    const streak = streakFrom(history)
    const best = Math.max(state.best, streak)
    const next: FlipState = { side, streak, best, history }
    setState(next)
    host.write(next)
    setGrade(null)
  }

  function resetAll() {
    const next = initialState()
    setState(next)
    host.write(next)
    setGrade(null)
  }

  function gradeCard() {
    setGrade(state.side === 'Heads' ? 'Correct' : 'Incorrect')
  }

  function copyHistory() {
    const text = state.history.map((s, i) => `${i + 1}. ${s}`).join('\n')
    void copy(text)
  }

  function exportHistory() {
    const text = state.history.join(', ')
    void saveText(text, { filename: 'coin-flip-history.txt', mimeType: 'text/plain' })
  }

  const history = state.history
  const currentStreak = state.streak
  const bestStreak = state.best

  const historyRows = history.slice(-50).map((side, i) => {
    const idx = history.length - Math.min(history.length, 50) + i + 1
    return {
      cells: {
        n: String(idx),
        side,
        streak: String(streakFrom(history.slice(0, idx))),
      },
    }
  })

  const headsCount = history.filter((s) => s === 'Heads').length
  const tailsCount = history.filter((s) => s === 'Tails').length

  return (
    <main
      style={{
        display: 'block',
        width: '100%',
        maxWidth: 'calc(560px * var(--sf))',
        margin: '0 auto',
        padding: 'calc(20px * var(--sf))',
      }}
    >
      <h1
        style={{
          margin: 0,
          font: '600 calc(24px * var(--tf)) var(--serif)',
          color: 'var(--ink)',
          letterSpacing: 'calc(-0.01em * var(--tf))',
        }}
      >
        Coin Flip
      </h1>
      <Body style={{ marginTop: 'calc(6px * var(--sf))' }}>
        Flip the coin, watch the streak, keep the best. Nothing leaves the browser. Open the history log to review,
        copy, or export every flip.
      </Body>

      <Card mono="FLIP" title="Result" style={{ marginTop: 'calc(14px * var(--sf))' }}>
        <Stack lg>
          <div
            aria-live="polite"
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              padding: 'calc(16px * var(--sf))',
              textAlign: 'center',
              border: 'calc(2px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(10px * var(--sf))',
              background: 'var(--ui-bright)',
              boxShadow: 'var(--shadow)',
              font: '600 calc(22px * var(--tf)) var(--serif)',
              color: 'var(--ink)',
            }}
          >
            {state.side}
            <button
              type="button"
              aria-label="Grade"
              title="Grade the result card"
              onClick={gradeCard}
              style={{
                position: 'absolute',
                top: 'calc(8px * var(--sf))',
                right: 'calc(8px * var(--sf))',
                width: 'calc(22px * var(--sf))',
                height: 'calc(22px * var(--sf))',
                padding: 0,
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(4px * var(--sf))',
                background: 'var(--ui-bright)',
                color: 'var(--mid)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'calc(12px * var(--sf))',
            }}
          >
            <span style={{ font: '500 calc(14px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
              Streak: {currentStreak}
            </span>
            <span style={{ font: '500 calc(14px * var(--tf)) var(--sans)', color: 'var(--mid)' }}>
              Best: {bestStreak}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button kind="primary" onClick={flipCoin}>
              Flip
            </Button>
            <Button kind="ghost" onClick={resetAll}>
              Reset
            </Button>
            <Button kind="secondary" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Hide history' : 'Show history'}
            </Button>
          </div>

          {grade && (
            <div
              aria-live="polite"
              role="status"
              style={{
                font: '500 calc(13px * var(--tf)) var(--sans)',
                color: grade === 'Correct' ? 'var(--ink)' : 'var(--danger)',
                padding: 'calc(8px * var(--sf))',
                textAlign: 'center',
                border: `calc(1px * var(--sf)) solid ${grade === 'Correct' ? 'var(--ui-line2)' : 'var(--danger)'}`,
                borderRadius: 'calc(6px * var(--sf))',
                background: grade === 'Correct' ? 'var(--ui-bright)' : 'var(--accent-soft)',
              }}
            >
              {grade === 'Correct'
                ? 'Correct — Heads is the winning face.'
                : 'Incorrect — Tails landed this time. Heads is the target.'}
            </div>
          )}
        </Stack>
      </Card>

      {showHistory && (
        <Card
          mono="HISTORY"
          title="Flip log"
          actions={
            <div style={{ display: 'flex', gap: 'calc(6px * var(--sf))' }}>
              <Button kind="secondary" onClick={copyHistory}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button kind="secondary" onClick={exportHistory}>
                Export
              </Button>
            </div>
          }
          style={{ marginTop: 'calc(14px * var(--sf))' }}
        >
          <Stack lg>
            <KpiRow>
              <Kpi value={history.length} label="Total flips" />
              <Kpi value={headsCount} label="Heads" accent={headsCount >= tailsCount && headsCount > 0} />
              <Kpi value={tailsCount} label="Tails" accent={tailsCount > headsCount} />
            </KpiRow>
            {history.length === 0 ? (
              <EmptyState title="No flips yet" detail="Press Flip to start building your log." />
            ) : (
              <div>
                <MonoLabel sm>
                  FIRST {Math.min(history.length, 50)} OF {history.length}
                </MonoLabel>
                <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
                  <Table
                    columns={[
                      { key: 'n', label: '#', num: true },
                      { key: 'side', label: 'Side' },
                      { key: 'streak', label: 'Streak at', num: true },
                    ]}
                    rows={historyRows}
                  />
                </div>
              </div>
            )}
          </Stack>
        </Card>
      )}
    </main>
  )
}
