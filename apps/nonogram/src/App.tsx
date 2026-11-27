import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
  Tag,
} from '@lacuna/ui'
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
type Tab = 'board' | 'history'

export function App() {
  const [seedInput, setSeedInput] = useState('')
  const [seed, setSeed] = useState<number | null>(() => {
    const s = loadSession()
    return s.active ? s.seed : null
  })
  const [filled, setFilled] = useState<Record<string, boolean>>(() => loadSession().filled)
  const [tab, setTab] = useState<Tab>('board')
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

  const onNewPuzzle = useCallback(() => {
    const n = parseInt(seedInput.trim(), 10)
    if (Number.isNaN(n)) {
      showToast('Enter a number for the seed')
      return
    }
    setSeedInput(String(n))
    setSeed(n)
    setFilled({})
  }, [seedInput, showToast])

  const onCheck = useCallback(() => {
    if (seed === null || puzzle === null) return
    const result = checkPuzzle(puzzle, filled)
    if (result.solved) {
      showToast('Solved!')
      setBest((b) => (b === null ? filledCount : Math.min(b, filledCount)))
      setHistory((h) => [{ seed, at: Date.now(), solved: true }, ...h].slice(0, 20))
    } else {
      showToast(`Not solved: ${result.right} of 13 filled cells are right and ${result.missing} are missing`)
      setHistory((h) => [{ seed, at: Date.now(), solved: false }, ...h].slice(0, 20))
    }
  }, [seed, puzzle, filled, filledCount, showToast])

  const onHistoryNewPuzzle = useCallback(() => {
    setTab('board')
    setSeed(1)
    setSeedInput('1')
    setFilled({})
  }, [])

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

  const boardCard = (
    <Card
      mono="Board"
      title="Puzzle"
      actions={
        <Actions>
          <Button kind="primary" onClick={onNewPuzzle}>
            New puzzle
          </Button>
          <Button onClick={onCheck}>Check</Button>
        </Actions>
      }
    >
      <Stack>
        <div className={styles.stats}>
          <span className={styles.score}>Score: {filledCount}</span>
          <span className={styles.cells}>Cells: {SIZE * SIZE}</span>
        </div>

        {puzzle === null ? (
          <p className={styles.enterSeed}>Enter a seed to start</p>
        ) : (
          <div className={styles.gridBlock}>
            <div className={styles.topClues} aria-label="Column clues">
              {puzzle.colClues.map((clue, c) => (
                <div key={`col-${c}`} className={styles.colClue} aria-label={`Column ${c + 1} clues`}>
                  {clue.join(' ')}
                </div>
              ))}
            </div>
            <div className={styles.rowLayout}>
              <div className={styles.leftClues} aria-label="Row clues">
                {puzzle.rowClues.map((clue, r) => (
                  <div key={`row-${r}`} className={styles.rowClue} aria-label={`Row ${r + 1} clues`}>
                    {`R${r + 1}: ${clue.join(' ')}`}
                  </div>
                ))}
              </div>
              <Board cols={SIZE} rows={SIZE} cell={36} label="Puzzle grid">
                {Array.from({ length: SIZE }, (_, r) =>
                  Array.from({ length: SIZE }, (_, c) => {
                    const k = keyOf(r, c)
                    const isOn = !!filled[k]
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-label={`Cell row ${r + 1}, column ${c + 1}`}
                        aria-pressed={isOn}
                        className={`${styles.cell} ${isOn ? styles.cellOn : ''}`}
                        onClick={() => toggleCell(r, c)}
                      >
                        {isOn ? 'X' : '-'}
                      </button>
                    )
                  }),
                )}
              </Board>
            </div>
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
        </div>

        {best !== null && <p className={styles.bestLine}>Best: {best}</p>}
        {toast && (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        )}
      </Stack>
    </Card>
  )

  const historyCard = (
    <Card
      mono="History"
      title="History"
      actions={
        <Actions>
          <Button onClick={onHistoryNewPuzzle}>New puzzle</Button>
        </Actions>
      }
    >
      <Stack>
        <p className={styles.historyNote}>
          {best !== null ? `Best score: ${best}` : 'No scores yet. Solve a puzzle to record a best.'}
        </p>
        {history.length === 0 ? (
          <p className={styles.historyEmpty}>No history yet.</p>
        ) : (
          <List label="Puzzle history">
            {history.map((h, i) => (
              <Row
                key={i}
                title={`Seed ${h.seed} - ${h.solved ? 'Solved' : 'Attempted'}`}
                meta={new Date(h.at).toLocaleDateString()}
              />
            ))}
          </List>
        )}
      </Stack>
    </Card>
  )

  return (
    <AppShell
      name="Nonogram Puzzle"
      icon="grid"
      hue="rust"
      category="Personal"
      meta={`${filledCount} filled`}
      side={
        <Rail title="Nonogram" note={`${SIZE}×${SIZE} grid`} chips={['Score', 'Best']}>
          <KpiRow>
            <Kpi value={String(filledCount)} label="Score" accent />
            <Kpi value={best !== null ? String(best) : '—'} label="Best" />
          </KpiRow>
          <Tag>{seed !== null ? `Seed ${seed}` : 'No puzzle'}</Tag>
        </Rail>
      }
    >
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

      <div id="panel-board" role="tabpanel" aria-labelledby="tab-board" className={tab === 'board' ? styles.panel : styles.panelHidden}>
        {boardCard}
      </div>

      <div
        id="panel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
        className={tab === 'history' ? styles.panel : styles.panelHidden}
      >
        {historyCard}
      </div>
    </AppShell>
  )
}
