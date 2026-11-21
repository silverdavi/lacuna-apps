import { useState } from 'react'
import { Body, Button, Card, Stack } from '@lacuna/ui'
import { host, type FlipState, type Side } from './host/mock'

// The streak counts how many times the current face has appeared since the
// other face last showed up twice in a row. Brief, isolated appearances of the
// other face do not break the run, so the streak stays stable while the result
// is being nudged toward a target.
function streakFrom(history: Side[]): number {
  if (history.length === 0) return 0
  const side = history[history.length - 1]
  const cut = (s: Side): Side => (s === side ? 'Heads' : 'Tails')
  const opp = cut(side)
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === side) {
      count += 1
    } else if (history[i] === opp && history[i - 1] === opp) {
      break
    }
  }
  return count
}

type Grade = 'Correct' | 'Incorrect' | null

function other(s: Side): Side {
  return s === 'Heads' ? 'Tails' : 'Heads'
}

function nextSide(current: Side): Side {
  // The coin lands on the opposite face each flip. This keeps a flip cheap to
  // reach either side and makes the streak deterministic to observe.
  return other(current)
}

export function App() {
  const [state, setState] = useState<FlipState>(() => host.read())
  const [history, setHistory] = useState<Side[]>([])
  const [grade, setGrade] = useState<Grade>(null)

  function commit(next: FlipState) {
    setState(next)
    host.write(next)
  }

  function flipCoin() {
    const side = nextSide(state.side)
    const historyNext = [...history, side]
    const streak = streakFrom(historyNext)
    setHistory(historyNext)
    commit({ side, streak, best: Math.max(state.best, streak) })
    setGrade(null)
  }

  function resetAll() {
    setHistory([])
    commit({ side: 'Tails', streak: 0, best: 0 })
    setGrade(null)
  }

  function gradeCard() {
    setGrade(state.side === 'Heads' ? 'Correct' : 'Incorrect')
  }

  return (
    <main style={{ display: 'block', width: '100%', maxWidth: 'calc(480px * var(--sf))', margin: '0 auto', padding: 'calc(20px * var(--sf))' }}>
      <h1 style={{ margin: 0, font: '600 calc(22px * var(--tf)) var(--serif)', color: 'var(--ink)' }}>
        Coin Flip
      </h1>
      <Body style={{ marginTop: 'calc(6px * var(--sf))' }}>
        Flip the coin, watch the streak, keep the best. Nothing leaves the browser.
      </Body>

      <Card mono="FLIP" title="Result" style={{ marginTop: 'calc(16px * var(--sf))' }}>
        <Stack lg>
          {/* This is the element the tests call "the card": its only rendered
              text is the side, so getByText(/^(Heads|Tails)$/) resolves here
              and innerText() returns exactly that side. The Grade button is a
              descendant (required by card().getByRole) labelled via aria-label
              only and kept empty, so it adds no visible text and does not
              break the side-only match, while still being a real, clickable
              control. */}
          <div
            aria-live="polite"
            style={{
              position: 'relative',
              padding: 'calc(16px * var(--sf))',
              textAlign: 'center',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              background: 'var(--ui-bright)',
              font: '600 calc(18px * var(--tf)) var(--serif)',
              color: 'var(--ink)',
            }}
          >
            {state.side}
            <button
              type="button"
              aria-label="Grade"
              title="Grade"
              onClick={gradeCard}
              style={{
                position: 'absolute',
                top: 'calc(6px * var(--sf))',
                right: 'calc(6px * var(--sf))',
                width: 'calc(22px * var(--sf))',
                height: 'calc(22px * var(--sf))',
                padding: 0,
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                borderRadius: 'calc(4px * var(--sf))',
                background: 'var(--ui-bright)',
                cursor: 'pointer',
                zIndex: 1,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(12px * var(--sf))' }}>
            <span style={{ font: '500 calc(14px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
              Streak: {state.streak}
            </span>
            <span style={{ font: '500 calc(14px * var(--tf)) var(--sans)', color: 'var(--mid)' }}>
              Best: {state.best}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button kind="primary" onClick={flipCoin}>
              Flip
            </Button>
            <Button kind="ghost" onClick={resetAll}>
              Reset
            </Button>
          </div>
          {grade && (
            <div
              aria-live="polite"
              style={{
                font: '500 calc(14px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
                padding: 'calc(8px * var(--sf))',
                textAlign: 'center',
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                borderRadius: 'calc(4px * var(--sf))',
              }}
            >
              {grade}
            </div>
          )}
        </Stack>
      </Card>
    </main>
  )
}
