import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Stack } from '@lacuna/ui'
import { host, type Session } from './host'
import { generatePuzzle, keyOf, countFilled, checkPuzzle } from './engine'
import { useHotkeys } from '@lacuna/use-hotkeys'
import styles from './App.module.css'

const SIZE = 5

function loadSession(): Session {
  return host.records.nonogram.get('session') ?? {
    active: false,
    seed: 1,
    size: SIZE,
    filled: {},
    history: [],
    best: null,
  }
}

type HistoryItem = { seed: number; at: number; solved: boolean }

export function App() {
  const [seedInput, setSeedInput] = useState('')
  const [seed, setSeed] = useState<number | null>(() => {
    const s = loadSession()
    return s.active ? s.seed : null
  })
  const [filled, setFilled] = useState<Record<string, boolean>>(() => loadSession().filled)
  const [tab, setTab] = useState<'board' | 'history'>('board')
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(() => loadSession().history)
  const [best, setBest] = useState<number | null>(() => loadSession().best)
  const toastTimer = useRef<number | null>(null)

  const puzzle = useMemo(() => (seed !== null ? generatePuzzle(seed, SIZE) : null), [seed])

  useEffect(() => {
    host.records.nonogram.update('session', {
      active: seed !== null,
      seed: seed ?? 1,
      size: SIZE,
      filled,
      history,
      best,
    })
  }, [seed, filled, history, best])

  const filledCount = useMemo(() => countFilled(filled), [filled])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  const toggleCell = useCallback((r: number, c: number) => {
    setFilled((prev) => {
      const next = { ...prev }
      const k = keyOf(r, c)
      if (next[k]) delete next[k]
      else next[k] = true
      return next
    })
  }, [])

  const newPuzzle = useCallback((s: number) => {
    setSeed(s)
    setFilled({})
  }, [])

  const onNewPuzzle = useCallback(() => {
    const n = parseInt(seedInput.trim(), 10)
    if (Number.isNaN(n)) {
      showToast('Enter a number for the seed')
      return
    }
    setSeedInput(String(n))
    newPuzzle(n)
  }, [seedInput, newPuzzle, showToast])

  const onCheck = useCallback(() => {
    if (seed === null) return
    const { wrong, solved } = checkPuzzle(SIZE, filled)
    if (solved) {
      showToast('Solved!')
      setBest((b) => (b === null ? filledCount : Math.min(b, filledCount)))
      setHistory((h) => [{ seed, at: Date.now(), solved: true }, ...h].slice(0, 20))
    } else {
      showToast(`Incorrect: ${wrong} cell(s) wrong`)
      setHistory((h) => [{ seed, at: Date.now(), solved: false }, ...h].slice(0, 20))
    }
  }, [seed, filled, filledCount, showToast])

  const onHistoryNewPuzzle = useCallback(() => {
    setTab('board')
    newPuzzle(1)
    setSeedInput('1')
  }, [newPuzzle])

  useHotkeys(
    useMemo(
      () => [
        {
          keys: 'enter',
          handler: () => {
            onCheck()
          },
        },
      ],
      [onCheck],
    ),
    { enabled: seed !== null },
  )

  const gridTemplate = `minmax(1.5rem, auto) repeat(${SIZE}, 1.4rem)`

  return (
    <AppShell name="Nonogram" icon="grid" hue="rust" category="Personal">
      <div className={styles.page}>
        <h1 className={styles.heading}>Nonogram Puzzle</h1>
        <Stack>
          <div className={styles.stats}>
            <span className={styles.score}>Score: {filledCount}</span>
            <span className={styles.cells}>Cells: {SIZE * SIZE}</span>
          </div>

          <div role="tablist" aria-label="Views" className={styles.tablist}>
            <button
              id="tab-board"
              type="button"
              role="tab"
              aria-selected={tab === 'board'}
              aria-controls="panel-board"
              className={`${styles.tab} ${tab === 'board' ? styles.tabActive : ''}`}
              onClick={() => setTab('board')}
            >
              Board
            </button>
            <button
              id="tab-history"
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              aria-controls="panel-history"
              className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
              onClick={() => setTab('history')}
            >
              History
            </button>
          </div>

          <div id="panel-board" role="tabpanel" aria-labelledby="tab-board" className={styles.panel}>
            <Stack>
              {puzzle === null ? (
                <p className={styles.enterSeed}>Enter a seed to start</p>
              ) : (
                <div
                  role="grid"
                  aria-label="Puzzle grid"
                  className={styles.grid}
                  style={{ gridTemplateColumns: gridTemplate, gridTemplateRows: gridTemplate }}
                >
                  <div className={styles.corner} aria-hidden="true" />
                  {Array.from({ length: SIZE }, (_, c) => (
                    <div key={`ch-${c}`} role="columnheader" aria-label={`Column ${c + 1} clues`} className={styles.clue}>
                      {puzzle.colClues[c].join(' ')}
                    </div>
                  ))}
                  {Array.from({ length: SIZE }, (_, r) => (
                    <GridRow
                      key={`row-${r}`}
                      row={r}
                      clueText={puzzle.rowClues[r].join(' ')}
                      size={SIZE}
                      filled={filled}
                      onToggle={toggleCell}
                    />
                  ))}
                </div>
              )}

              <div className={styles.controls}>
                <label className={styles.seedField} htmlFor="seed-input">
                  Seed
                </label>
                <input
                  id="seed-input"
                  type="text"
                  inputMode="numeric"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  className={styles.seedInput}
                />
                <Button kind="primary" onClick={onNewPuzzle}>
                  New puzzle
                </Button>
                <Button onClick={onCheck}>Check</Button>
              </div>
              {best !== null && <p className={styles.bestLine}>Best: {best}</p>}
              {toast && (
                <div className={styles.toast} role="status">
                  {toast}
                </div>
              )}
            </Stack>
          </div>

          <div
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className={tab === 'history' ? styles.panel : styles.panelHidden}
          >
            <Stack>
              <p className={styles.historyNote}>
                {best !== null ? `Best score: ${best}` : 'No scores yet. Solve a puzzle to record a best.'}
              </p>
              {history.length === 0 ? (
                <p className={styles.historyEmpty}>No history yet.</p>
              ) : (
                <ol className={styles.historyList}>
                  {history.map((h, i) => (
                    <li key={i} className={styles.historyItem}>
                      <span>Seed {h.seed} - {h.solved ? 'Solved' : 'Attempted'}</span>
                    </li>
                  ))}
                </ol>
              )}
              <Button onClick={onHistoryNewPuzzle}>New puzzle</Button>
            </Stack>
          </div>
        </Stack>
      </div>
    </AppShell>
  )
}

function GridRow({
  row,
  clueText,
  size,
  filled,
  onToggle,
}: {
  row: number
  clueText: string
  size: number
  filled: Record<string, boolean>
  onToggle: (r: number, c: number) => void
}) {
  return (
    <div role="row" className={styles.rowEl}>
      <div role="rowheader" aria-label={`Row ${row + 1} clues`} className={styles.clue}>
        {clueText}
      </div>
      {Array.from({ length: size }, (_, c) => {
        const k = keyOf(row, c)
        const isOn = !!filled[k]
        return (
          <button
            key={k}
            type="button"
            role="gridcell"
            aria-label={`Row ${row + 1}, Column ${c + 1}`}
            aria-pressed={isOn}
            className={`${styles.cell} ${isOn ? styles.cellOn : ''}`}
            onClick={() => onToggle(row, c)}
          >
            {isOn ? 'X' : '-'}
          </button>
        )
      })}
    </div>
  )
}
